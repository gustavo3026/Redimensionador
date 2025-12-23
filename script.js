/* =============================================================
   script.js — Versión Profesional
   • Nuevos nombres: E25, E06
   • Opción OTRO con dimensiones personalizadas
   • Dark mode toggle
   ============================================================= */

/* ----------- Resoluciones por empresa Actualizadas ----------- */
const presets = {
  e25: [ // Antes Noriega Vanzulli
    { width: 640, height: 480, folder: 'NV_640x480' },
    { width: 104, height: 78,  folder: 'NV_104x78'  }
  ],
  e06: [ // Antes EMASA
    { width: 1200, height: 800, folder: 'GRANDE'  },
    { width: 800,  height: 533, folder: 'MEDIANA' },
    { width: 350,  height: 233, folder: 'CHICA'   }
  ]
};

/* -------------------- Elementos del DOM -------------------- */
const dropArea    = document.getElementById('drop-area');
const fileInput   = document.getElementById('fileElem');
const preview     = document.getElementById('preview');
const btnResize   = document.getElementById('resizeButton');
const companySel  = document.getElementById('company');
const customDims  = document.getElementById('custom-dimensions');
const customWInput = document.getElementById('customWidth');
const customHInput = document.getElementById('customHeight');
const themeToggle = document.getElementById('theme-toggle');

let filesToProcess = [];

/* -------------------- Lógica Dark Mode -------------------- */
// Al cargar, verificar preferencia guardada o del sistema
if (localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
  document.body.classList.add('dark-mode');
  document.body.classList.remove('light-mode');
} else {
  document.body.classList.add('light-mode');
  document.body.classList.remove('dark-mode');
}

themeToggle.addEventListener('click', () => {
  if (document.body.classList.contains('dark-mode')) {
    document.body.classList.replace('dark-mode', 'light-mode');
    localStorage.setItem('theme', 'light');
  } else {
    document.body.classList.replace('light-mode', 'dark-mode');
    localStorage.setItem('theme', 'dark');
  }
});

/* ---------------- Lógica Selección "OTRO" ----------------- */
companySel.addEventListener('change', (e) => {
  if (e.target.value === 'otro') {
    customDims.classList.remove('hidden');
  } else {
    customDims.classList.add('hidden');
  }
});

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
  // Añadir nuevos archivos a los existentes en lugar de reemplazar
  const newFiles = [...fileList].filter(f => f.type.startsWith('image/'));
  filesToProcess = [...filesToProcess, ...newFiles];
  renderPreview(filesToProcess);
  btnResize.disabled = filesToProcess.length === 0;
}

function renderPreview(files) {
  preview.innerHTML = '';
  files.forEach(file => {
    const url  = URL.createObjectURL(file);
    const img  = document.createElement('img');
    img.src    = url;
    img.title  = file.name;
    img.onload = () => URL.revokeObjectURL(url);
    preview.appendChild(img);
  });
}

/* =============================================================
   LÓGICA PRINCIPAL DE PROCESAMIENTO (Click Botón)
   ============================================================= */
btnResize.addEventListener('click', async () => {
  if (filesToProcess.length === 0) return;
  
  btnResize.disabled = true;
  const originalBtnText = btnResize.innerText;
  btnResize.innerText = "Procesando...";

  const zip = new JSZip();
  const selectedMode = companySel.value;

  try {
    // --- RAMA 1: Modo Personalizado (OTRO) ---
    if (selectedMode === 'otro') {
      const targetW = parseInt(customWInput.value);
      const targetH = parseInt(customHInput.value);

      if (!targetW || !targetH || targetW <= 0 || targetH <= 0) {
        alert("Por favor, ingresa un Ancho y Alto válidos (mayores a 0).");
        throw new Error("Dimensiones inválidas");
      }

      for (const file of filesToProcess) {
        const bitmap = await createImageBitmap(file);
        const isPNG  = file.type === 'image/png';
        const blob = await resizeWithPadding(
          bitmap, targetW, targetH, isPNG ? 'image/png' : 'image/jpeg'
        );
        const baseName = file.name.replace(/\.[^/.]+$/, '');
        const ext      = isPNG ? '.png' : '.jpg';
        const imgName  = `${baseName}_${targetW}x${targetH}${ext}`;
        
        // Guardar en la raíz del ZIP
        zip.file(imgName, blob);
      }

    // --- RAMA 2: Modos Preset (E25, E06) ---
    } else {
      const preset = presets[selectedMode];
      for (const file of filesToProcess) {
        const bitmap = await createImageBitmap(file);
        const isPNG  = file.type === 'image/png';

        for (const res of preset) {
          const blob = await resizeWithPadding(
            bitmap, res.width, res.height, isPNG ? 'image/png' : 'image/jpeg'
          );
          const baseName = file.name.replace(/\.[^/.]+$/, '');
          const ext      = isPNG ? '.png' : '.jpg';
          const imgName  = `${baseName}${ext}`;
          
          // Guardar en subcarpeta correspondiente
          zip.folder(res.folder).file(imgName, blob);
        }
      }
    }

    // Generar y descargar
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    // Nombre del ZIP dinámico según la selección
    const zipName = selectedMode === 'otro' ? 'imagenes_personalizadas.zip' : `imagenes_${selectedMode.toUpperCase()}.zip`;
    saveAs(zipBlob, zipName);
    
    // Limpieza tras éxito
    filesToProcess = [];
    preview.innerHTML = '';
    if (selectedMode === 'otro') {
       customWInput.value = '';
       customHInput.value = '';
    }

  } catch (error) {
    console.error(error);
    if (error.message !== "Dimensiones inválidas") {
        alert("Hubo un error al procesar las imágenes.");
    }
  } finally {
    btnResize.disabled = filesToProcess.length === 0;
    btnResize.innerText = originalBtnText;
  }
});

/* ----------- Función de redimensionado (sin cambios) ---------- */
function resizeWithPadding(bitmap, targetW, targetH, mimeType) {
  return new Promise(resolve => {
    const canvas = document.createElement('canvas');
    canvas.width  = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');

    if (mimeType === 'image/jpeg') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, targetW, targetH);
    } else {
      ctx.clearRect(0, 0, targetW, targetH);
    }

    const ratio   = Math.min(targetW / bitmap.width, targetH / bitmap.height);
    const newW    = Math.round(bitmap.width  * ratio);
    const newH    = Math.round(bitmap.height * ratio);
    const offsetX = (targetW - newW) / 2;
    const offsetY = (targetH - newH) / 2;

    ctx.drawImage(bitmap, offsetX, offsetY, newW, newH);

    canvas.toBlob(
      blob => resolve(blob),
      mimeType,
      mimeType === 'image/jpeg' ? 0.92 : undefined
    );
  });
}
