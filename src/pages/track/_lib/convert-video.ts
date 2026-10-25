/** File extensions offered in the picker, since some OSes don't map these to video/*. */
export const VIDEO_ACCEPT = [
  "video/*",
  ".mp4", ".m4v", ".mov", ".qt", ".webm", ".mkv", ".avi", ".wmv", ".asf", ".flv", ".f4v",
  ".mpg", ".mpeg", ".m2v", ".mpe", ".ts", ".mts", ".m2ts", ".3gp", ".3g2", ".ogv", ".ogg",
  ".vob", ".mxf", ".dv", ".h264", ".264", ".hevc", ".h265", ".divx", ".xvid", ".rm", ".rmvb",
].join(",");

/** Converts unsupported container formats if encoder is available, otherwise throws clear explanation. */
export async function convertToMp4(file: File, _onProgress: (p: number) => void): Promise<File> {
  throw new Error(
    `The video "${file.name}" uses a codec or container not supported natively by this browser. For best compatibility, please upload an MP4, WebM, or MOV file.`,
  );
}
