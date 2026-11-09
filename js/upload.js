let supabaseClient = null;

// 설정을 확인하고 Supabase 연결을 처음 한 번 만든 뒤 재사용합니다.
function getClient() {
  if (supabaseClient) {
    return supabaseClient;
  }

  if (
    typeof SUPABASE_URL === "undefined" ||
    typeof SUPABASE_KEY === "undefined" ||
    SUPABASE_URL === "여기에-내-프로젝트주소" ||
    SUPABASE_KEY === "여기에-내-키" ||
    !SUPABASE_URL ||
    !SUPABASE_KEY
  ) {
    throw new Error("js/config.js 에 내 Supabase 주소와 키를 먼저 넣어 주세요");
  }
  if (typeof supabase === "undefined" || typeof supabase.createClient !== "function") {
    throw new Error("Supabase 연결 도구를 불러오지 못했어요. 인터넷 연결과 CDN 주소를 확인해 주세요.");
  }

  supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  return supabaseClient;
}

// 완성 캔버스를 JPG로 변환해 photos 버킷에 올리고 공개 주소를 돌려줍니다.
async function uploadPhoto(canvas) {
  if (
    typeof HTMLCanvasElement === "undefined" ||
    !(canvas instanceof HTMLCanvasElement) ||
    canvas.width <= 0 ||
    canvas.height <= 0
  ) {
    throw new Error("올릴 사진이 올바르지 않아요. 다시 촬영해 주세요.");
  }

  const client = getClient();
  const photoBlob = await new Promise(
    // JPG 변환 완료 신호를 기다리고 변환 실패를 업로드 오류로 전달합니다.
    function (resolve, reject) {
      canvas.toBlob(
        // 변환 결과가 없으면 파일 생성 실패로 알립니다.
        function (blob) {
          if (!blob) {
            reject(new Error("사진을 JPG 파일로 만들지 못했어요. 다시 시도해 주세요."));
            return;
          }
          resolve(blob);
        },
        "image/jpeg",
        0.9
      );
    }
  );

  const dateTime = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  let randomPart = "";
  for (let index = 0; index < 6; index += 1) {
    randomPart += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  const fileName = dateTime + "-" + randomPart + ".jpg";
  const uploadResult = await client.storage.from(PHOTO_BUCKET).upload(fileName, photoBlob, {
    contentType: "image/jpeg",
    upsert: false
  });
  if (uploadResult.error) {
    throw uploadResult.error;
  }
  if (!uploadResult.data || !uploadResult.data.path) {
    throw new Error("업로드된 사진 경로를 확인하지 못했어요. Storage 설정을 확인해 주세요.");
  }

  const publicUrlResult = client.storage.from(PHOTO_BUCKET).getPublicUrl(uploadResult.data.path);
  if (!publicUrlResult.data || !publicUrlResult.data.publicUrl) {
    throw new Error("공개 사진 주소를 만들지 못했어요. photos 버킷 설정을 확인해 주세요.");
  }
  return publicUrlResult.data.publicUrl;
}

// QR 표시 영역을 비우고 사진 주소를 담은 200×200 QR 코드를 그립니다.
function drawQrCode(element, url) {
  if (!element || typeof element.replaceChildren !== "function") {
    throw new Error("QR 코드를 표시할 화면을 찾지 못했어요.");
  }
  if (typeof url !== "string" || !url) {
    throw new Error("QR 코드로 만들 사진 주소가 없어요.");
  }
  element.replaceChildren();
  if (typeof QRCode === "undefined") {
    throw new Error("QR 코드 도구를 불러오지 못했어요. 인터넷 연결과 CDN 주소를 확인해 주세요.");
  }

  return new QRCode(element, {
    text: url,
    width: 200,
    height: 200
  });
}
