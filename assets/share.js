(() => {
  const button = document.getElementById("shareVariuno");
  const status = document.getElementById("shareStatus");
  if (!button || !status) return;

  button.addEventListener("click", async () => {
    const url = window.location.origin + window.location.pathname + window.location.search + window.location.hash;
    const shareData = {
      title: "Variuno Tools — Free online tools",
      text: "Resize images, work with PDFs, and use free browser tools with Variuno.",
      url
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        status.textContent = "Thanks for sharing Variuno.";
      } catch (error) {
        if (error.name !== "AbortError") status.textContent = "Sharing did not work. You can copy the site address from your browser.";
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      status.textContent = "Site link copied. Share it with someone who could use these tools.";
    } catch (_) {
      status.textContent = "Copy this address to share Variuno: ";
      const link = document.createElement("a");
      link.href = url;
      link.textContent = url;
      status.appendChild(link);
    }
  });
})();
