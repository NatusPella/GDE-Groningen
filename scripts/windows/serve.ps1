# Static server for the web build, for players: needs only Windows PowerShell
# (no Python, no Node). Same behaviour as web/serve.mjs: Range requests, real
# MIME types, 127.0.0.1 only.   serve.ps1 -Port 8765 -Dir <map met index.html>
param([int]$Port = 8765, [Parameter(Mandatory = $true)][string]$Dir)
$ErrorActionPreference = 'Stop'
$Dir = (Resolve-Path -LiteralPath $Dir).Path
Add-Type -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Threading;
public static class GdeServe {
  static readonly Dictionary<string, string> Types = new Dictionary<string, string> {
    {".html","text/html; charset=utf-8"},{".js","text/javascript"},{".mjs","text/javascript"},{".css","text/css"},
    {".json","application/json"},{".md","text/markdown; charset=utf-8"},{".bin","application/octet-stream"},
    {".pack","application/octet-stream"},{".glb","model/gltf-binary"},{".png","image/png"},{".svg","image/svg+xml"},
    {".woff2","font/woff2"},{".mp3","audio/mpeg"},{".wav","audio/wav"},{".webm","audio/webm"},{".wasm","application/wasm"}};
  public static void Run(int port, string root) {
    var l = new HttpListener();
    l.Prefixes.Add("http://127.0.0.1:" + port + "/");
    l.Start();
    while (true) {
      var c = l.GetContext();
      ThreadPool.QueueUserWorkItem(_ => { try { Handle(c, root); } catch { try { c.Response.Abort(); } catch { } } });
    }
  }
  static void Handle(HttpListenerContext c, string root) {
    var res = c.Response;
    string url = Uri.UnescapeDataString(c.Request.Url.AbsolutePath);
    string file = Path.GetFullPath(Path.Combine(root, url.TrimStart('/').Replace('/', Path.DirectorySeparatorChar)));
    if (!file.StartsWith(root, StringComparison.OrdinalIgnoreCase)) { res.StatusCode = 403; res.Close(); return; }
    if (Directory.Exists(file)) file = Path.Combine(file, "index.html");
    if (!File.Exists(file)) { res.StatusCode = 404; res.Close(); return; }
    long size = new FileInfo(file).Length, start = 0, end = size - 1;
    string ext = Path.GetExtension(file).ToLowerInvariant(), type;
    res.ContentType = Types.TryGetValue(ext, out type) ? type : "application/octet-stream";
    res.AddHeader("Accept-Ranges", "bytes");
    res.AddHeader("Cache-Control", "max-age=600");
    var m = System.Text.RegularExpressions.Regex.Match(c.Request.Headers["Range"] ?? "", @"^bytes=(\d+)-(\d*)$");
    if (m.Success) {
      start = long.Parse(m.Groups[1].Value);
      if (m.Groups[2].Value != "") end = Math.Min(end, long.Parse(m.Groups[2].Value));
      if (start > end) { res.StatusCode = 416; res.Close(); return; }
      res.StatusCode = 206;
      res.AddHeader("Content-Range", "bytes " + start + "-" + end + "/" + size);
    }
    res.ContentLength64 = end - start + 1;
    using (var f = new FileStream(file, FileMode.Open, FileAccess.Read, FileShare.ReadWrite)) {
      f.Seek(start, SeekOrigin.Begin);
      var buf = new byte[81920];
      long left = end - start + 1;
      while (left > 0) {
        int n = f.Read(buf, 0, (int)Math.Min(buf.Length, left));
        if (n <= 0) break;
        res.OutputStream.Write(buf, 0, n);
        left -= n;
      }
    }
    res.Close();
  }
}
'@
[GdeServe]::Run($Port, $Dir)
