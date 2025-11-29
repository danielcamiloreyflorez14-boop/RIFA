// Archivo: social.js
// Lógica para comentarios, chat y calificación (persistencia con Local Storage)

let currentRating = 0;

function initSocialModule() {
    const stars = document.querySelectorAll('#starRating i');
    stars.forEach(star => {
        star.addEventListener('click', function() {
            currentRating = parseInt(this.getAttribute('data-rating'));
            updateStarDisplay();
        });
        star.addEventListener('mouseover', function() {
            highlightStars(parseInt(this.getAttribute('data-rating')));
        });
        star.addEventListener('mouseout', function() {
            updateStarDisplay();
        });
    });
    // Inicializar la visualización del rating a 0
    updateStarDisplay();
    // Renderizar los comentarios existentes al cargar
    renderComments();
}

function updateStarDisplay() {
    const stars = document.querySelectorAll('#starRating i');
    stars.forEach(star => {
        const rating = parseInt(star.getAttribute('data-rating'));
        if (rating <= currentRating) {
            star.classList.add('selected');
        } else {
            star.classList.remove('selected');
        }
    });
}

function highlightStars(rating) {
    const stars = document.querySelectorAll('#starRating i');
    stars.forEach(star => {
        const starRating = parseInt(star.getAttribute('data-rating'));
        if (starRating <= rating) {
            star.style.color = getCssVar('--warning');
        } else {
            star.style.color = getCssVar('--text-muted');
        }
    });
}

function getComments() {
    const saved = localStorage.getItem(STORAGE_KEY_SOCIAL);
    return saved ? JSON.parse(saved) : [];
}

function saveComments(comments) {
    localStorage.setItem(STORAGE_KEY_SOCIAL, JSON.stringify(comments));
}

function handleRatingSubmit(event) {
    event.preventDefault();
    const name = document.getElementById('chatName').value.trim();
    const message = document.getElementById('chatMessage').value.trim();
    
    if (name.length === 0 || message.length === 0 || currentRating === 0) {
        return toast("Debes llenar todos los campos y dar una calificación.", 'error');
    }
    
    const newComment = {
        name: name,
        message: message,
        rating: currentRating,
        timestamp: Date.now()
    };
    
    const comments = getComments();
    comments.unshift(newComment); 
    saveComments(comments);

    document.getElementById('chatMessage').value = '';
    currentRating = 0;
    updateStarDisplay();
    renderComments();
    toast("¡Gracias por tu opinión y calificación!", 'success');
}

function renderStars(rating) {
    let starsHtml = '<span class="rating">';
    for (let i = 1; i <= 5; i++) {
        const className = i <= rating ? 'fas fa-star' : 'far fa-star';
        starsHtml += `<i class="${className}"></i>`;
    }
    starsHtml += '</span>';
    return starsHtml;
}

function renderComments() {
    const chatContent = document.getElementById('chatContent');
    const comments = getComments();
    chatContent.innerHTML = '';
    
    if (comments.length === 0) {
        chatContent.innerHTML = '<p style="color:var(--text-muted); text-align:center;">Sé el primero en dejar un comentario y calificación.</p>';
        return;
    }

    comments.forEach(comment => {
        const timeAgo = new Date(comment.timestamp).toLocaleDateString('es-CO', { 
            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' 
        });

        const div = document.createElement('div');
        div.className = 'chat-message';
        div.innerHTML = `
            <strong>${comment.name}</strong> 
            ${renderStars(comment.rating)}
            <p style="margin: 5px 0 0;">${comment.message}</p>
            <small>${timeAgo}</small>
        `;
        chatContent.appendChild(div);
    });
}