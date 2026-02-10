// ===== 90s RETRO MOUSE TRAIL =====
document.addEventListener('DOMContentLoaded', function() {
    const trailEmojis = ['⭐', '✨', '💫', '🌟', '⚡', '💥', '🔥', '🎨', '🌈', '💎'];
    let mouseX = 0;
    let mouseY = 0;
    let lastTrailTime = 0;
    const trailDelay = 30; // milliseconds between trail elements

    // Track mouse position
    document.addEventListener('mousemove', function(e) {
        mouseX = e.pageX;
        mouseY = e.pageY;
        
        const currentTime = Date.now();
        if (currentTime - lastTrailTime > trailDelay) {
            createTrailElement(mouseX, mouseY);
            lastTrailTime = currentTime;
        }
    });

    function createTrailElement(x, y) {
        const trail = document.createElement('div');
        trail.className = 'mouse-trail';
        trail.textContent = trailEmojis[Math.floor(Math.random() * trailEmojis.length)];
        trail.style.left = x + 'px';
        trail.style.top = y + 'px';
        
        // Random slight offset for variety
        const offsetX = (Math.random() - 0.5) * 20;
        const offsetY = (Math.random() - 0.5) * 20;
        trail.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
        
        document.body.appendChild(trail);
        
        // Remove element after animation completes
        setTimeout(() => {
            trail.remove();
        }, 600);
    }
});
