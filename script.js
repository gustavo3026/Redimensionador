/* =============================================================
   script.js — versión con:
   • Empresas originales (noriega, emasa)
   • Drag & drop
   • PREVISUALIZACIÓN de imágenes
   • Soporte completo a PNG (entrada y salida)
   • Nombres SIN sufijo de dimensiones
   ============================================================= */

/* ----------- Resoluciones por empresa (originales) ----------- */
const presets = {
  noriega: [
    { width: 640, height: 480, folder: 'NV_640x480' },
    { width: 104, height: 78,  folder: 'NV_104x78'  }
  ],
  emasa: [
    { width: 1200, height: 800, folder: 'GRANDE'  },
    { width: 800,  height: 533, folder: 'MEDIANA' },
    { width: 350,  height: 233, folder: 'CHICA'   }
  ]
};

/* -------------------- Elementos del DOM -------------------- */
const dropArea   = document.getElementById('drop-area');
const fileInput  = document.getElementById('fileElem');
const btnResize  = document.getElementById('resizeButton');
const companySel = document.getElementById('company');

/* ----- Crea contenedor de previsualización si no existe ----- */
let preview = document.getElementById('preview');
if (!preview) {
  preview = document.createElement('div');
  preview.id = 'preview';
  preview.style.display  = 'flex';
  preview.style.flexWrap = 'wrap';
  preview.style.gap      = '8px';
  dropArea.insertAdjacentElement('afterend', preview);
}

let filesToProcess = [];

/* ---------------- Drag & drop + selección ------------------ */
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(evt =>
  dropArea.addEventListener(evt, e => {
    e.preventDefault();
    e.stopPropagation();
  })
);

dropArea.addEventListener('dragover', () => dropArea.classList.add('dragover'));
dropArea.addEventListener('dragleave', () => dropArea.classList.remove('dragover'));
dropArea.addEventListener('drop', e => {
  dropArea.classList.remove('dragover');
  handleFiles(e.dataTransfer.files);
});

dropArea.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', e => handleFiles(e.target.files));

function handleFiles(fileList) {
  filesToProcess = [...fileList].filter(f => f.type.startsWith('image/'));
  renderPreview(filesToProcess);
  btnResize.disabled = filesToProcess.length === 0;
}

function renderPreview(files) {
  preview.innerHTML = '';              // limpia miniaturas viejas
  files.forEach(file => {
    const url  = URL.createObjectURL(file);
    const img  = document.createElement('img');
    img.src    = url;
    img.title  = file.name;
    img.style.width  = '100px';
    img.style.height = 'auto';
    img.style.objectFit = 'cover';
    img.style.border   = '1px solid #ccc';
    img.onload = () => URL.revokeObjectURL(url); // libera memoria
    preview.appendChild(img);
  });
}

/* -------------- Redimensionado y creación del ZIP ----------- */
btnResize.addEventListener('click', async () => {
  btnResize.disabled = true;

  const zip    = new JSZip();
  const preset = presets[companySel.value];

  for (const file of filesToProcess) {
    const bitmap = await createImageBitmap(file);
    const isPNG  = file.type === 'image/png';

    for (const res of preset) {
      const blob = await resizeWithPadding(
        bitmap,
        res.width,
        res.height,
        isPNG ? 'image/png' : 'image/jpeg'
      );

      const baseName = file.name.replace(/\.[^/.]+$/, '');      // sin extensión
      const ext      = isPNG ? '.png' : '.jpg';
      const imgName  = `${baseName}${ext}`;                     // sin dimensiones

      zip.folder(res.folder).file(imgName, blob);
    }
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  saveAs(zipBlob, 'imagenes_redimensionadas.zip');

  btnResize.disabled = false;
  filesToProcess = [];
  preview.innerHTML = '';                                       // limpia previsualización
});

/* ----------- Función de redimensionado con relleno ---------- */
function resizeWithPadding(bitmap, targetW, targetH, mimeType) {
  return new Promise(resolve => {
    const canvas = document.createElement('canvas');
    canvas.width  = targetW;
    canvas.height = targetH;

    const ctx = canvas.getContext('2d');

    // FONDO: blanco para JPEG, transparente para PNG
    if (mimeType === 'image/jpeg') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, targetW, targetH);
    } else {
      ctx.clearRect(0, 0, targetW, targetH); // mantiene transparencia
    }

    /* Cálculo de escala y centrado */
    const ratio   = Math.min(targetW / bitmap.width, targetH / bitmap.height);
    const newW    = Math.round(bitmap.width  * ratio);
    const newH    = Math.round(bitmap.height * ratio);
    const offsetX = (targetW - newW) / 2;
    const offsetY = (targetH - newH) / 2;

    ctx.drawImage(bitmap, offsetX, offsetY, newW, newH);

    /* toBlob: calidad solo aplica en JPEG */
    canvas.toBlob(
      blob => resolve(blob),
      mimeType,
      mimeType === 'image/jpeg' ? 0.92 : undefined
    );
  });
}
