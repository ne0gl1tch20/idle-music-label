package idle.music.label;

import android.content.Intent;
import android.content.pm.PackageInfo;
import android.net.Uri;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(name = "AppUpdate")
public class AppUpdatePlugin extends Plugin {
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private static final String RELEASES_API = "https://api.github.com/repos/ne0gl1tch20/idle-music-label/releases/latest";

    @PluginMethod
    public void checkForUpdate(PluginCall call) {
        executor.execute(() -> {
            HttpURLConnection connection = null;
            try {
                connection = (HttpURLConnection) new URL(RELEASES_API).openConnection();
                connection.setRequestMethod("GET");
                connection.setConnectTimeout(10000);
                connection.setReadTimeout(10000);
                connection.setRequestProperty("Accept", "application/vnd.github+json");
                connection.setRequestProperty("User-Agent", "Soundhouse-Android");
                int status = connection.getResponseCode();
                if (status == 404) {
                    JSObject result = new JSObject();
                    result.put("updateAvailable", false);
                    result.put("message", "No Android release has been published yet.");
                    call.resolve(result);
                    return;
                }
                if (status < 200 || status >= 300) throw new IllegalStateException("GitHub returned HTTP " + status);
                StringBuilder body = new StringBuilder();
                try (BufferedReader reader = new BufferedReader(new InputStreamReader(connection.getInputStream()))) {
                    String line;
                    while ((line = reader.readLine()) != null) body.append(line);
                }
                JSONObject release = new JSONObject(body.toString());
                String latest = release.optString("tag_name", "").replaceFirst("^[vV]", "");
                String current = getContext().getPackageManager().getPackageInfo(getContext().getPackageName(), 0).versionName;
                boolean available = compareVersions(latest, current) > 0;
                String apkUrl = "";
                JSONArray assets = release.optJSONArray("assets");
                if (assets != null) {
                    for (int i = 0; i < assets.length(); i++) {
                        JSONObject asset = assets.optJSONObject(i);
                        if (asset != null && asset.optString("name", "").toLowerCase().endsWith(".apk")) {
                            apkUrl = asset.optString("browser_download_url", "");
                            break;
                        }
                    }
                }
                JSObject result = new JSObject();
                result.put("updateAvailable", available);
                result.put("currentVersion", current);
                result.put("latestVersion", latest);
                result.put("releaseUrl", release.optString("html_url", "https://github.com/ne0gl1tch20/idle-music-label/releases"));
                result.put("apkUrl", apkUrl);
                call.resolve(result);
            } catch (Exception error) {
                call.reject("Could not check for updates: " + error.getMessage());
            } finally {
                if (connection != null) connection.disconnect();
            }
        });
    }

    @PluginMethod
    public void openReleasePage(PluginCall call) {
        String url = call.getString("url", "https://github.com/ne0gl1tch20/idle-music-label/releases");
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception error) {
            call.reject("Could not open the release page.", error);
        }
    }

    private int compareVersions(String left, String right) {
        String[] a = left.split("[.-]");
        String[] b = right.split("[.-]");
        int count = Math.max(a.length, b.length);
        for (int i = 0; i < count; i++) {
            int av = i < a.length ? parsePart(a[i]) : 0;
            int bv = i < b.length ? parsePart(b[i]) : 0;
            if (av != bv) return Integer.compare(av, bv);
        }
        return 0;
    }

    private int parsePart(String value) {
        String digits = value.replaceAll("[^0-9].*$", "");
        try { return digits.isEmpty() ? 0 : Integer.parseInt(digits); }
        catch (NumberFormatException ignored) { return 0; }
    }
}
