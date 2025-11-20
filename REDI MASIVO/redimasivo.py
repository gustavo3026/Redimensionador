#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
from PIL import Image
import tkinter as tk
from tkinter import filedialog, simpledialog
from tqdm import tqdm

# --- Presets de resoluciones por empresa ---
PRESETS = {
    'noriega': [
        (640, 480, 'NV_640x480'),
        (104,  78,  'NV_104x78'),
    ],
    'emasa': [
        (1200, 800, 'GRANDE'),
        (800,  533, 'MEDIANA'),
        (350,  233, 'CHICA'),
    ]
}

def select_directory(title):
    """Abre un dialog para seleccionar carpeta."""
    root = tk.Tk()
    root.withdraw()
    path = filedialog.askdirectory(title=title)
    root.destroy()
    return path

def choose_company():
    """Pide al usuario la empresa y valida."""
    companies = list(PRESETS.keys())
    prompt = f"Selecciona empresa ({', '.join(companies)}):"
    while True:
        # Simple input por consola
        choice = input(prompt).strip().lower()
        if choice in companies:
            return choice
        print("Empresa no válida, intenta de nuevo.")

def resize_with_padding(img: Image.Image, target_w: int, target_h: int, bg_color=(255,255,255,0)):
    """Redimensiona manteniendo aspecto, centrada y con relleno."""
    src_w, src_h = img.size
    ratio = min(target_w/src_w, target_h/src_h)
    new_w = int(src_w * ratio)
    new_h = int(src_h * ratio)
    img_resized = img.resize((new_w, new_h), Image.LANCZOS)

    # Crear lienzo
    mode = 'RGBA' if img_resized.mode=='RGBA' else 'RGB'
    canvas = Image.new(mode, (target_w, target_h), color=bg_color)
    offset = ((target_w - new_w)//2, (target_h - new_h)//2)
    canvas.paste(img_resized, offset, img_resized if mode=='RGBA' else None)
    return canvas

def main():
    print("== Redimensionador masivo de imágenes ==")
    src_dir = select_directory("Carpeta de origen de imágenes")
    if not src_dir:
        print("No se seleccionó carpeta de origen. Saliendo.")
        return
    dst_dir = select_directory("Carpeta de destino")
    if not dst_dir:
        print("No se seleccionó carpeta de destino. Saliendo.")
        return
    company = choose_company()

    preset = PRESETS[company]
    # Crear carpetas de salida
    for _, _, folder in preset:
        os.makedirs(os.path.join(dst_dir, folder), exist_ok=True)

    # Listar archivos de imágenes
    valid_exts = ('.png','.jpg','.jpeg')
    files = [f for f in os.listdir(src_dir)
             if f.lower().endswith(valid_exts)]
    if not files:
        print("No hay archivos de imagen en la carpeta de origen.")
        return

    # Procesamiento con barra de progreso
    for filename in tqdm(files, desc="Procesando", unit="img"):
        src_path = os.path.join(src_dir, filename)
        try:
            with Image.open(src_path) as img:
                img = img.convert('RGBA') if img.mode in ('RGBA','LA') else img.convert('RGB')
                base_name, ext = os.path.splitext(filename)
                is_png = ext.lower()=='.png'

                for w, h, folder in preset:
                    out_img = resize_with_padding(
                        img, w, h,
                        bg_color=(255,255,255,0) if is_png else (255,255,255)
                    )
                    out_ext = '.png' if is_png else '.jpg'
                    out_name = f"{base_name}{out_ext}"
                    out_path = os.path.join(dst_dir, folder, out_name)
                    # Guardar con calidad decente
                    if is_png:
                        out_img.save(out_path, format='PNG')
                    else:
                        out_img.save(out_path, format='JPEG', quality=92)
        except Exception as e:
            tqdm.write(f"Error con {filename}: {e}")

    print("¡Proceso completado!")

if __name__ == "__main__":
    main()
