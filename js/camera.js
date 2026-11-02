// 카메라 장치의 오류를 사용자가 이해할 수 있는 한국어 오류로 바꿉니다.
function makeCameraError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

// 카메라 권한을 요청하고 영상 재생과 크기 준비까지 마친 스트림을 돌려줍니다.
async function startCamera(video) {
  if (!video) {
    throw makeCameraError("VIDEO_ELEMENT_MISSING", "카메라 화면을 찾지 못했어요. 페이지를 새로고침해 주세요.");
  }

  if (!window.isSecureContext && window.location.protocol !== "file:") {
    throw makeCameraError("INSECURE_CONTEXT", "카메라는 보안 연결(HTTPS) 또는 내 기기에서 직접 연 파일에서 사용할 수 있어요.");
  }

  if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== "function") {
    throw makeCameraError("CAMERA_UNSUPPORTED", "이 브라우저는 카메라 기능을 지원하지 않아요. 최신 브라우저에서 다시 열어 주세요.");
  }

  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "user" } },
      audio: false
    });
  } catch (cause) {
    if (cause && (cause.name === "NotAllowedError" || cause.name === "PermissionDeniedError" || cause.name === "SecurityError")) {
      throw makeCameraError("CAMERA_PERMISSION_DENIED", "브라우저에서 이 사이트의 카메라 권한을 허용한 뒤 촬영 시작을 다시 눌러 주세요.");
    }
    if (cause && (cause.name === "NotFoundError" || cause.name === "DevicesNotFoundError")) {
      throw makeCameraError("CAMERA_NOT_FOUND", "사용할 수 있는 카메라를 찾지 못했어요. 카메라가 연결되어 있는지 확인해 주세요.");
    }
    if (cause && (cause.name === "NotReadableError" || cause.name === "TrackStartError")) {
      throw makeCameraError("CAMERA_IN_USE", "카메라가 다른 앱에서 사용 중일 수 있어요. 다른 앱을 닫고 다시 시도해 주세요.");
    }
    if (cause && cause.name === "OverconstrainedError") {
      throw makeCameraError("CAMERA_CONSTRAINT", "기기의 카메라 설정을 사용할 수 없어요. 카메라 설정을 확인한 뒤 다시 시도해 주세요.");
    }
    throw makeCameraError("CAMERA_DEVICE_ERROR", "카메라 장치를 준비하지 못했어요. 연결 상태와 권한을 확인한 뒤 다시 시도해 주세요.");
  }

  try {
    video.srcObject = stream;
    await video.play();

    for (let attempt = 0; attempt < 50; attempt += 1) {
      if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
        return stream;
      }
      await new Promise(
        // 일정한 간격으로 카메라 영상의 준비 상태를 다시 확인합니다.
        function (resolve) {
          window.setTimeout(resolve, 100);
        }
      );
    }

    throw makeCameraError("VIDEO_SIZE_TIMEOUT", "카메라 영상의 크기를 준비하지 못했어요. 카메라가 다른 앱에서 사용 중인지 확인한 뒤 다시 시도해 주세요.");
  } catch (cause) {
    for (const track of stream.getTracks()) {
      track.stop();
    }
    video.srcObject = null;

    if (cause && typeof cause.code === "string") {
      throw cause;
    }
    throw makeCameraError("CAMERA_PLAYBACK_FAILED", "카메라 영상을 재생하지 못했어요. 브라우저의 카메라 권한과 페이지 설정을 확인해 주세요.");
  }
}

// 현재 카메라 화면의 가운데를 잘라 4:3 캔버스로 한 컷 촬영합니다.
function captureShot(video) {
  if (!video || video.readyState < 2 || video.videoWidth <= 0 || video.videoHeight <= 0) {
    throw makeCameraError("VIDEO_NOT_READY", "카메라 영상이 아직 준비되지 않았어요. 영상이 보일 때까지 기다린 뒤 다시 시도해 주세요.");
  }

  const sourceWidth = video.videoWidth;
  const sourceHeight = video.videoHeight;
  let cropWidth = sourceWidth;
  let cropHeight = sourceHeight;

  if (sourceWidth / sourceHeight > 4 / 3) {
    cropWidth = sourceHeight * 4 / 3;
  } else {
    cropHeight = sourceWidth * 3 / 4;
  }

  const sourceX = (sourceWidth - cropWidth) / 2;
  const sourceY = (sourceHeight - cropHeight) / 2;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(4, Math.floor(cropWidth / 4) * 4);
  canvas.height = canvas.width * 3 / 4;

  const context = canvas.getContext("2d");
  if (!context) {
    throw makeCameraError("CANVAS_UNAVAILABLE", "사진을 만들 화면을 준비하지 못했어요. 최신 브라우저에서 다시 시도해 주세요.");
  }

  try {
    context.drawImage(video, sourceX, sourceY, cropWidth, cropHeight, 0, 0, canvas.width, canvas.height);
  } catch (cause) {
    throw makeCameraError("CAPTURE_FAILED", "사진을 촬영하지 못했어요. 카메라 화면을 확인하고 다시 시도해 주세요.");
  }
  return canvas;
}
