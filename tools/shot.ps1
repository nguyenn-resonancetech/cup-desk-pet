param([int]$x,[int]$y,[int]$w,[int]$h,[string]$out)
Add-Type -AssemblyName System.Drawing
Add-Type @"
using System; using System.Runtime.InteropServices;
public class DPI { [DllImport("user32.dll")] public static extern bool SetProcessDPIAware(); }
"@
[DPI]::SetProcessDPIAware() | Out-Null
$bmp = New-Object System.Drawing.Bitmap $w, $h
$gr = [System.Drawing.Graphics]::FromImage($bmp)
$gr.CopyFromScreen($x, $y, 0, 0, $bmp.Size)
$bmp.Save($out)
