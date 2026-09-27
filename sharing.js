(() => {
  document
    .querySelector("[data-copy-home]")
    ?.addEventListener("click", async () => {
      const status = document.getElementById("share-status");
      try {
        await navigator.clipboard.writeText("https://hirecharlienow.com/");
        status.textContent = "Site link copied. Thanks for passing it on!";
      } catch {
        status.textContent = "Copy this address: https://hirecharlienow.com/";
      }
    });
})();
