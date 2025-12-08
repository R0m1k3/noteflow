/**
 * Compresse une image en la redimensionnant et en réduisant sa qualité
 * @param file - Le fichier image à compresser
 * @param maxWidth - Largeur maximale (défaut: 1920px)
 * @param maxHeight - Hauteur maximale (défaut: 1080px)
 * @param quality - Qualité de compression JPEG (0-1, défaut: 0.8)
 * @returns Promise<File> - Le fichier image compressé
 */
export async function compressImage(
  file: File,
  maxWidth: number = 1920,
  maxHeight: number = 1080,
  quality: number = 0.8
): Promise<File> {
  return new Promise((resolve, reject) => {
    // Vérifier que c'est bien une image
    if (!file.type.startsWith('image/')) {
      reject(new Error('Le fichier n\'est pas une image'));
      return;
    }

    // Si l'image est déjà petite (< 1MB), on la retourne telle quelle
    const oneMB = 1024 * 1024;
    if (file.size < oneMB) {
      resolve(file);
      return;
    }

    const reader = new FileReader();

    reader.onerror = () => reject(new Error('Erreur lors de la lecture du fichier'));

    reader.onload = (e) => {
      const img = new Image();

      img.onerror = () => reject(new Error('Erreur lors du chargement de l\'image'));

      img.onload = () => {
        try {
          // Calculer les nouvelles dimensions en gardant le ratio
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }

          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }

          // Créer un canvas pour redimensionner l'image
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Impossible de créer le contexte canvas'));
            return;
          }

          // Dessiner l'image redimensionnée
          ctx.drawImage(img, 0, 0, width, height);

          // Déterminer le type de sortie et la qualité
          let outputType = 'image/jpeg';
          let outputQuality = quality;

          // Si c'est un PNG avec transparence, on garde le format PNG
          if (file.type === 'image/png') {
            // Vérifier si l'image a de la transparence
            const imageData = ctx.getImageData(0, 0, width, height);
            const hasTransparency = imageData.data.some((_, i) => i % 4 === 3 && imageData.data[i] < 255);

            if (hasTransparency) {
              outputType = 'image/png';
              outputQuality = 0.9; // PNG utilise une compression sans perte
            }
          }

          // Convertir le canvas en Blob
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Erreur lors de la conversion de l\'image'));
                return;
              }

              // Si l'image compressée fait toujours plus de 2MB, on réduit encore la qualité
              const twoMB = 2 * 1024 * 1024;
              if (blob.size > twoMB && outputType === 'image/jpeg' && outputQuality > 0.5) {
                // Réessayer avec une qualité plus faible
                canvas.toBlob(
                  (blob2) => {
                    if (!blob2) {
                      reject(new Error('Erreur lors de la deuxième compression'));
                      return;
                    }

                    // Créer un nouveau fichier avec le blob compressé
                    const compressedFile = new File(
                      [blob2],
                      file.name.replace(/\.[^/.]+$/, '.jpg'), // Remplacer l'extension par .jpg
                      { type: 'image/jpeg' }
                    );

                    resolve(compressedFile);
                  },
                  'image/jpeg',
                  0.6 // Qualité réduite
                );
                return;
              }

              // Créer un nouveau fichier avec le blob compressé
              const extension = outputType === 'image/png' ? '.png' : '.jpg';
              const compressedFile = new File(
                [blob],
                file.name.replace(/\.[^/.]+$/, extension),
                { type: outputType }
              );

              resolve(compressedFile);
            },
            outputType,
            outputQuality
          );
        } catch (error) {
          reject(error);
        }
      };

      img.src = e.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Formate la taille d'un fichier en MB ou KB
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
