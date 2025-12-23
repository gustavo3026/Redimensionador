import os
import sys
import tkinter as tk
from tkinter import filedialog, simpledialog, messagebox
from PIL import Image

# --- Configuración de Empresas (Presets) ---
PRESETS = {
    'e25': [ # Antes Noriega Vanzulli
        (640, 480, 'NV_640x480'),
        (104,  78,  'NV_104x78'),
    ],
    'e06': [ # Antes EMASA
        (1200, 800, 'GRANDE'),
        (800,  533, 'MEDIANA'),
        (350,  233, 'CHICA'),
    ]
}

def resize_with_padding(img: Image.Image, target_w: int, target_h: int, bg_color=(255,255,255,0)):
    """Redimensiona manteniendo aspecto, centrada y con relleno (Canvas)."""
    src_w, src_h = img.size
    ratio = min(target_w/src_w, target_h/src_h)
    new_w = int(src_w * ratio)
    new_h = int(src_h * ratio)
    img_resized = img.resize((new_w, new_h), Image.Resampling.LANCZOS)

    mode = 'RGBA' if img_resized.mode=='RGBA' else 'RGB'
    canvas = Image.new(mode, (target_w, target_h), color=bg_color)
    offset = ((target_w - new_w)//2, (target_h - new_h)//2)
    canvas.paste(img_resized, offset, img_resized if mode=='RGBA' else None)
    return canvas

def main():
    # Configuración ventana oculta
    root = tk.Tk()
    root.withdraw()
    root.attributes('-topmost', True) # Forzar que aparezca al frente en Mac

    # 1. Seleccionar Carpetas
    src_dir = filedialog.askdirectory(title="1. Selecciona carpeta de ORIGEN (Imágenes)")
    if not src_dir: return

    dst_dir = filedialog.askdirectory(title="2. Selecciona carpeta de DESTINO")
    if not dst_dir: return

    # 2. Seleccionar Modo (E06, E25, OTRO)
    options = "E25, E06, OTRO"
    mode_input = simpledialog.askstring(
        "Configuración", 
        f"Escribe el código ({options}):",
        initialvalue="E25"
    )
    
    if not mode_input: return
    mode = mode_input.lower().strip()

    # Variables de configuración según modo
    current_preset = []
    custom_w, custom_h = 0, 0
    is_custom = False

    # 3. Lógica según selección
    if mode == 'otro':
        is_custom = True
        dims = simpledialog.askstring("Dimensiones", "Ingresa Ancho x Alto (ej: 500x500):")
        if not dims: return
        try:
            # Separar por 'x' o ',' o espacio
            parts = dims.replace(',', 'x').replace(' ', 'x').split('x')
            custom_w = int(parts[0])
            custom_h = int(parts[1])
        except:
            messagebox.showerror("Error", "Formato incorrecto. Usa el formato: 500x500")
            return
    elif mode in PRESETS:
        current_preset = PRESETS[mode]
        # Crear subcarpetas automáticamente para modos empresa
        for _, _, folder in current_preset:
            os.makedirs(os.path.join(dst_dir, folder), exist_ok=True)
    else:
        messagebox.showerror("Error", f"Opción no válida. Debes elegir entre: {options}")
        return

    # 4. Procesamiento
    valid_exts = ('.png','.jpg','.jpeg')
    files = [f for f in os.listdir(src_dir) if f.lower().endswith(valid_exts)]
    
    if not files:
        messagebox.showinfo("Info", "No hay imágenes en la carpeta de origen.")
        return

    count = 0
    errors = 0

    for filename in files:
        src_path = os.path.join(src_dir, filename)
        try:
            with Image.open(src_path) as img:
                # Conversión estándar
                img = img.convert('RGBA') if img.mode in ('RGBA','LA') else img.convert('RGB')
                base_name, ext = os.path.splitext(filename)
                is_png = ext.lower() == '.png'
                bg_col = (255,255,255,0) if is_png else (255,255,255)

                # --- MODO PERSONALIZADO (OTRO) ---
                if is_custom:
                    out_img = resize_with_padding(img, custom_w, custom_h, bg_col)
                    
                    # Nombre con sufijo de dimensiones (ej: foto_500x500.jpg)
                    out_ext = '.png' if is_png else '.jpg'
                    out_name = f"{base_name}_{custom_w}x{custom_h}{out_ext}"
                    out_path = os.path.join(dst_dir, out_name)

                    if is_png: out_img.save(out_path, format='PNG')
                    else:      out_img.save(out_path, format='JPEG', quality=92)

                # --- MODO EMPRESA (E06, E25) ---
                else:
                    for w, h, folder in current_preset:
                        out_img = resize_with_padding(img, w, h, bg_col)
                        
                        out_ext = '.png' if is_png else '.jpg'
                        out_name = f"{base_name}{out_ext}" # Nombre limpio sin dimensiones
                        out_path = os.path.join(dst_dir, folder, out_name)

                        if is_png: out_img.save(out_path, format='PNG')
                        else:      out_img.save(out_path, format='JPEG', quality=92)
            
            count += 1
        except Exception as e:
            print(f"Error con {filename}: {e}")
            errors += 1

    # 5. Mensaje Final
    msg = f"¡Listo!\nProcesadas: {count}\nErrores: {errors}"
    messagebox.showinfo("Finalizado", msg)

if __name__ == "__main__":
    main()
