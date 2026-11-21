// Keep links to the former homepage program and its individual days working.
function syncProgramLinks() {
    const target = document.getElementById(window.location.hash.slice(1));
    if (target && target.matches("a[data-program-redirect]")) {
        window.location.replace(target.href);
        return;
    }

    // A reader switching languages from a particular day should land on that day.
    if (document.querySelector("main#program")) {
        const dayHash = target && target.classList.contains("program-day") ? window.location.hash : "";
        document.querySelectorAll(".language-switch a").forEach(function (link) {
            link.hash = dayHash;
        });
    }
}

window.addEventListener("hashchange", syncProgramLinks);
syncProgramLinks();
