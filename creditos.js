document.addEventListener("DOMContentLoaded", () => {
  const container = document.querySelector(".creditos-contenido");

  // Agrega clase para animación de entrada
  container.classList.add("animar-entrada");

  // Animación de fondo en movimiento con degradado de color dinámico
  const fondo = document.body;
  let hue = 0;
  setInterval(() => {
    hue = (hue + 0.2) % 360;
    fondo.style.background = `linear-gradient(135deg, hsl(hue, 100{(hue + 60) % 360}, 100%, 50%))`;
  }, 50);

  // Evento para mostrar contacto en un modal o alerta
  const contactoBtn = document.getElementById("mostrar-contacto");
  if (contactoBtn) {
    contactoBtn.addEventListener("click", () => {
      const mensaje = `
💬 Contacto del desarrollador:
📧 Email: danielcamilo.14@outlook.com
📱 WhatsApp: +57 322 708 6610
🌐 Sitio web: https://danielcamiloreyflorez14-boop.github.io/RIFA/
`;
      alert(mensaje);
    });
  }

  // Animación de texto tipo máquina de escribir (opcional)
  const textoAnimado = document.getElementById("texto-dinamico");
  const frases = ["Gracias por visitar este proyecto legendario 🏆",
    "Desarrollado con pasión por Daniel Camilo Rey Flórez 💻",
    "¡Apoya este proyecto compartiéndolo! 🚀"
  ];
  let fraseIndex = 0;
  let letraIndex = 0;

  function escribirFrase() {
    if (!textoAnimado) return;

    if (letraIndex < frases[fraseIndex].length) {
      textoAnimado.textContent += frases[fraseIndex].charAt(letraIndex);
      letraIndex++;
      setTimeout(escribirFrase, 50);
    } else {
      setTimeout(() => {
        textoAnimado.textContent = "";
        fraseIndex = (fraseIndex + 1) % frases.length;
        letraIndex = 0;
        escribirFrase();
      }, 2500);
    }
  }

  escribirFrase();
});
const audio = new Audio('RUSO.mp3');
document.querySelectorAll('.btn-click').forEach(el => {
  el.addEventListener('click', () => {
    audio.currentTime = 0;
    audio.play();
  });
});