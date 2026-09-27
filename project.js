(() => {
  const button = document.querySelector("[data-load-model]");
  button?.addEventListener("click", () => {
    const frame = document.createElement("iframe");
    frame.title =
      "Charlie Woodhead’s Stray-inspired robot — interactive 3D model";
    frame.src =
      "https://sketchfab.com/models/ce0619a05bbd4f40b1f296c1d78efd0f/embed?autostart=1";
    frame.allow = "autoplay; fullscreen; xr-spatial-tracking";
    frame.allowFullscreen = true;
    frame.referrerPolicy = "strict-origin-when-cross-origin";
    document.getElementById("model-viewer").replaceChildren(frame);
  });
})();
