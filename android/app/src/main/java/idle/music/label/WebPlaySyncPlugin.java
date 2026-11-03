package idle.music.label;

import android.content.SharedPreferences;
import android.util.AtomicFile;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

@CapacitorPlugin(name = "WebPlaySync")
public class WebPlaySyncPlugin extends Plugin {
    private static final String RELEASE_API = "https://api.github.com/repos/ne0gl1tch20/idle-music-label/releases/tags/web-play";
    private static final String PREFS = "SoundhouseWebPlaySync";
    private static final String KEY_VERSION = "activeVersion";
    private static final String KEY_SYNCED_AT = "syncedAt";
    private static final long MAX_BUNDLE_BYTES = 80L * 1024L * 1024L;
    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    @PluginMethod
    public void getStatus(PluginCall call) {
        SharedPreferences prefs = getContext().getSharedPreferences(PREFS, 0);
        JSObject result = new JSObject();
        result.put("version", prefs.getString(KEY_VERSION, "bundled"));
        result.put("syncedAt", prefs.getLong(KEY_SYNCED_AT, 0));
        result.put("hasSynced", prefs.contains(KEY_VERSION));
        call.resolve(result);
    }

    @PluginMethod
    public void checkAndSync(PluginCall call) {
        executor.execute(() -> {
            HttpURLConnection connection = null;
            File downloadedZip = null;
            File staging = null;
            try {
                connection = open(RELEASE_API);
                JSONObject release = new JSONObject(readText(connection, 2_000_000));
                JSONArray assets = release.optJSONArray("assets");
                if (assets == null) throw new IllegalStateException("The repository release has no assets.");

                String manifestUrl = findAssetUrl(assets, "web-play-manifest.json");
                if (manifestUrl == null) throw new IllegalStateException("Web Play manifest is missing from the repository release.");
                JSONObject manifest = new JSONObject(readUrl(manifestUrl, 2_000_000));
                String version = manifest.optString("version", "");
                String zipName = manifest.optString("bundle", "web-play.zip");
                String expectedHash = manifest.optString("sha256", "").toLowerCase(Locale.ROOT);
                if (!version.matches("[A-Za-z0-9._-]{1,100}") || !expectedHash.matches("[a-f0-9]{64}")) {
                    throw new IllegalStateException("The repository manifest is invalid.");
                }

                SharedPreferences prefs = getContext().getSharedPreferences(PREFS, 0);
                String activeVersion = prefs.getString(KEY_VERSION, "");
                if (version.equals(activeVersion)) {
                    JSObject result = new JSObject();
                    result.put("updated", false);
                    result.put("version", version);
                    result.put("message", "Web Play is already synced with the latest repository version.");
                    call.resolve(result);
                    return;
                }

                String zipUrl = findAssetUrl(assets, zipName);
                if (zipUrl == null) throw new IllegalStateException("The Web Play bundle is missing from the repository release.");
                File root = new File(getContext().getFilesDir(), "web-play");
                if (!root.exists() && !root.mkdirs()) throw new IllegalStateException("Could not create Web Play cache.");
                downloadedZip = new File(root, "download-" + version + ".zip");
                download(zipUrl, downloadedZip);
                if (!expectedHash.equals(sha256(downloadedZip))) throw new IllegalStateException("Web Play bundle checksum failed. The active version was not changed.");

                staging = new File(root, "staging-" + version);
                deleteRecursively(staging);
                if (!staging.mkdirs()) throw new IllegalStateException("Could not create the staging folder.");
                unzipSafely(downloadedZip, staging);
                File index = new File(staging, "index.html");
                File game = new File(staging, "play.html");
                if (!index.isFile() || !game.isFile()) throw new IllegalStateException("The downloaded Web Play bundle is incomplete.");

                File versions = new File(root, "versions");
                if (!versions.exists() && !versions.mkdirs()) throw new IllegalStateException("Could not create version storage.");
                File active = new File(versions, version);
                deleteRecursively(active);
                if (!staging.renameTo(active)) throw new IllegalStateException("Could not activate the verified Web Play bundle.");

                prefs.edit().putString(KEY_VERSION, version).putLong(KEY_SYNCED_AT, System.currentTimeMillis()).apply();
                JSObject result = new JSObject();
                result.put("updated", true);
                result.put("version", version);
                result.put("basePath", active.getAbsolutePath());
                result.put("message", "Downloaded, verified and staged the latest repository Web Play bundle.");
                call.resolve(result);
                pruneOldVersions(versions, active);
            } catch (Exception error) {
                call.reject("Web Play sync failed: " + error.getMessage());
            } finally {
                if (connection != null) connection.disconnect();
                if (downloadedZip != null) downloadedZip.delete();
                if (staging != null && staging.exists()) deleteRecursively(staging);
            }
        });
    }

    private HttpURLConnection open(String address) throws Exception {
        HttpURLConnection connection = (HttpURLConnection) new URL(address).openConnection();
        connection.setConnectTimeout(15000);
        connection.setReadTimeout(30000);
        connection.setRequestProperty("Accept", "application/vnd.github+json");
        connection.setRequestProperty("User-Agent", "Soundhouse-Android-WebPlaySync");
        int status = connection.getResponseCode();
        if (status < 200 || status >= 300) {
            connection.disconnect();
            throw new IllegalStateException("GitHub returned HTTP " + status + ".");
        }
        return connection;
    }

    private String readUrl(String address, int maxBytes) throws Exception {
        HttpURLConnection connection = open(address);
        try { return readText(connection, maxBytes); }
        finally { connection.disconnect(); }
    }

    private String readText(HttpURLConnection connection, int maxBytes) throws Exception {
        try (InputStream input = connection.getInputStream(); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[8192];
            int count;
            while ((count = input.read(buffer)) != -1) {
                if (output.size() + count > maxBytes) throw new IllegalStateException("Repository response is too large.");
                output.write(buffer, 0, count);
            }
            return output.toString("UTF-8");
        }
    }

    private String findAssetUrl(JSONArray assets, String name) {
        for (int i = 0; i < assets.length(); i++) {
            JSONObject asset = assets.optJSONObject(i);
            if (asset != null && name.equals(asset.optString("name"))) return asset.optString("browser_download_url", null);
        }
        return null;
    }

    private void download(String address, File destination) throws Exception {
        HttpURLConnection connection = open(address);
        try {
            long declared = connection.getContentLengthLong();
            if (declared > MAX_BUNDLE_BYTES) throw new IllegalStateException("Web Play bundle exceeds the size limit.");
            try (InputStream input = new BufferedInputStream(connection.getInputStream());
                 FileOutputStream output = new FileOutputStream(destination)) {
                byte[] buffer = new byte[16384];
                int count;
                long total = 0;
                while ((count = input.read(buffer)) != -1) {
                    total += count;
                    if (total > MAX_BUNDLE_BYTES) throw new IllegalStateException("Web Play bundle exceeds the size limit.");
                    output.write(buffer, 0, count);
                }
                output.getFD().sync();
            }
        } finally { connection.disconnect(); }
    }

    private String sha256(File file) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        try (InputStream input = new FileInputStream(file)) {
            byte[] buffer = new byte[16384];
            int count;
            while ((count = input.read(buffer)) != -1) digest.update(buffer, 0, count);
        }
        StringBuilder hex = new StringBuilder();
        for (byte value : digest.digest()) hex.append(String.format(Locale.ROOT, "%02x", value & 0xff));
        return hex.toString();
    }

    private void unzipSafely(File archive, File destination) throws Exception {
        String root = destination.getCanonicalPath() + File.separator;
        long total = 0;
        int entries = 0;
        try (ZipInputStream zip = new ZipInputStream(new BufferedInputStream(new FileInputStream(archive)))) {
            ZipEntry entry;
            while ((entry = zip.getNextEntry()) != null) {
                if (++entries > 5000) throw new IllegalStateException("Web Play bundle contains too many files.");
                File output = new File(destination, entry.getName());
                String canonical = output.getCanonicalPath();
                if (!canonical.startsWith(root)) throw new IllegalStateException("Unsafe path found in Web Play bundle.");
                if (entry.isDirectory()) {
                    if (!output.exists() && !output.mkdirs()) throw new IllegalStateException("Could not create bundle folder.");
                } else {
                    File parent = output.getParentFile();
                    if (parent != null && !parent.exists() && !parent.mkdirs()) throw new IllegalStateException("Could not create bundle folder.");
                    try (FileOutputStream stream = new FileOutputStream(output)) {
                        byte[] buffer = new byte[16384];
                        int count;
                        while ((count = zip.read(buffer)) != -1) {
                            total += count;
                            if (total > MAX_BUNDLE_BYTES * 4) throw new IllegalStateException("Expanded Web Play bundle is too large.");
                            stream.write(buffer, 0, count);
                        }
                    }
                }
                zip.closeEntry();
            }
        }
    }

    private void pruneOldVersions(File versions, File active) {
        File[] children = versions.listFiles();
        if (children == null) return;
        for (File child : children) if (!child.equals(active)) deleteRecursively(child);
    }

    private void deleteRecursively(File file) {
        if (file == null || !file.exists()) return;
        File[] children = file.listFiles();
        if (children != null) for (File child : children) deleteRecursively(child);
        file.delete();
    }
}
