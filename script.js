/**
 * @fileoverview Münchenbernsdorf Discover App
 * Main application script for interactive location discovery, visitor modes, and learning features.
 * Handles:
 * - Dark mode & language preferences (localStorage)
 * - Visited places tracking with persistence
 * - Visitor mode filtering (all, family, quick, rain, evening)
 * - Embedded map loading with error handling
 * - Quiz system with scoring
 * - Feedback form with spam protection
 * - PWA integration (Service Worker, manifest)
 * - Performance: lazy loading, reduced motion, responsive images
 * - Analytics: page views and user interactions
 */

// === Browser Compatibility Polyfills ===
if (!Object.entries) {
    Object.entries = function(obj) {
        const entries = [];
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                entries.push([key, obj[key]]);
            }
        }
        return entries;
    };
}

if (!window.matchMedia) {
    window.matchMedia = function(query) {
        return {
            matches: false,
            addListener: function() {},
            removeListener: function() {},
        };
    };
}

(() => {
    "use strict";

    // === DOM Elements ===
    const doc = document;
    const body = doc.body;
    const isHomePage = body.classList.contains("home-page");
    const isDetailPage = body.classList.contains("detail-page");
    const isEnPath = false;

    const darkToggle = doc.getElementById("darkToggle");
    const hamburger = doc.getElementById("hamburger");
    const navLinks = doc.getElementById("navLinks");
    const nav = doc.querySelector("nav");
    const hero = doc.querySelector(".hero");
    const scrollBtn = doc.getElementById("scrollTopBtn");

    const searchInput = doc.getElementById("searchInput");
    const clearSearch = doc.getElementById("clearSearch");
    const noResults = doc.getElementById("noResults");

    const placeCards = Array.from(doc.querySelectorAll(".card[data-place-id]"));
    const searchableCards = Array.from(doc.querySelectorAll(".card[data-search]"));
    const placeToggles = Array.from(doc.querySelectorAll("input[data-place-toggle]"));

    const visitProgressText = doc.getElementById("visitProgressText");
    const visitProgressBar = doc.getElementById("visitProgressBar");
    const visitSuggestion = doc.getElementById("visitSuggestion");
    const suggestPlaceBtn = doc.getElementById("suggestPlaceBtn");
    const resetVisitedBtn = doc.getElementById("resetVisitedBtn");

    const mapContainer = doc.getElementById("mapContainer");
    const mapStatus = doc.getElementById("mapStatus");
    const loadMapBtn = doc.getElementById("loadMapBtn");

    const quizProgress = doc.getElementById("quizProgress");
    const quizQuestion = doc.getElementById("quizQuestion");
    const quizAnswers = doc.getElementById("quizAnswers");
    const quizFeedback = doc.getElementById("quizFeedback");
    const nextQuizBtn = doc.getElementById("nextQuizBtn");
    const restartQuizBtn = doc.getElementById("restartQuizBtn");

    const rootPrefix = /\/Orte\/|\/orte\//.test(window.location.pathname) ? ".." : ".";
    const pageDefaultLang = "de";

    // === Storage Keys ===
    const STORAGE = {
        theme: "darkMode",
        visited: "visitedPlaces",
        analytics: "mb_analytics_v1",
        visitorFilter: "mb_visitor_filter",
        achievements: "mb_achievements_v1",
        quizDifficulty: "mb_quiz_difficulty",
        fontSize: "mb_font_size",
        highContrast: "mb_high_contrast",
    };

    // === State ===
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let activeVisitorFilter = "all";
    let dynamicTourState = null;
    let currentLang = "de";

    const contentCache = { de: null };

    const quizQuestions = [
        {
            question: "In welchem Bundesland liegt Münchenbernsdorf?",
            answers: ["Thüringen", "Bayern", "Sachsen"],
            correct: 0,
            detail: "Richtig: Münchenbernsdorf liegt in Thüringen."
        },
        {
            question: "Welcher Ort ist wichtig für die Stadtverwaltung?",
            answers: ["Historisches Rathaus", "Lichterpark Seliger", "Teppichfabrik"],
            correct: 0,
            detail: "Genau: Im Rathaus werden wichtige Dinge für die Stadt besprochen."
        },
        {
            question: "Was kann man an der historischen Teppichfabrik besonders gut lernen?",
            answers: ["Wie Menschen früher gearbeitet haben", "Wie man einen See baut", "Wie Sterne entstehen"],
            correct: 0,
            detail: "Stimmt: Die Teppichfabrik erzählt etwas über Arbeit und Industriegeschichte."
        },
        {
            question: "Welcher Ort erinnert an eine frühere Burg?",
            answers: ["Burg Münch (Wasserschloss)", "Rathaus", "Holzmarkt Seliger"],
            correct: 0,
            detail: "Richtig: Burg Münch wird auch Wasserschloss genannt."
        },
        {
            question: "Was solltest du bei einem Entdeckerweg besonders machen?",
            answers: ["Genau beobachten und Fragen stellen", "Alles möglichst schnell übersehen", "Nur auf den Boden schauen"],
            correct: 0,
            detail: "Sehr gut: Wer genau hinschaut, entdeckt an jedem Ort kleine Hinweise."
        }
    ];

    const fallbackContent = {
        de: {
            visitorModes: [
                { id: "all", label: "Alle" },
                { id: "family", label: "Klasse" },
                { id: "quick", label: "Kurzrunde" },
                { id: "rain", label: "Drinnen anschauen" },
                { id: "evening", label: "Lichter" }
            ],
            places: {
                kirche: {
                    name: "Stadtkirche St. Mauritius",
                    cardSummary: "Schaut genau hin: Kirchturm, Fenster und Eingang erzählen viel über alte Baukunst.",
                    search: "kirche stadtkirche mauritius turm fenster",
                    tags: ["quick", "rain"],
                    image: "kirche"
                },
                rathaus: {
                    name: "Historisches Rathaus",
                    cardSummary: "Hier werden wichtige Dinge für die Stadt besprochen und entschieden.",
                    search: "rathaus stadtverwaltung entscheidung ortskern",
                    tags: ["quick", "rain"],
                    image: "rathaus"
                },
                teppichfabrik: {
                    name: "Historische Teppichfabrik",
                    cardSummary: "Ein Ort, an dem man sieht, wie Menschen früher gearbeitet und Dinge hergestellt haben.",
                    search: "teppichfabrik industrie geschichte arbeit",
                    tags: ["quick", "rain"],
                    image: "alte_teppichfabrik"
                },
                wasserschloss: {
                    name: "Burg Münch (Wasserschloss)",
                    cardSummary: "Ein Ort für Spurensucher: Hier erinnert noch vieles an eine frühere Burg.",
                    search: "wasserschloss burg münch wasserburg spurensuche",
                    tags: ["quick", "evening"],
                    image: "wasserschloss"
                },
                seliger: {
                    name: "Holzmarkt und Lichterpark Seliger",
                    cardSummary: "Holzfiguren, Wege und Lichter machen diesen Ort besonders gut zum Beobachten.",
                    search: "seliger holzmarkt lichterpark holzfiguren",
                    tags: ["family", "evening"],
                    image: "seliger"
                }
            },
            tour: {
                title: "Entdeckerkarte",
                intro: "Wählt eine Station aus und schaut, welche Orte ihr als Klasse entdecken könnt.",
                openMap: "In Google Maps öffnen",
                routeTitle: "Route mit Koordinaten",
                routeIntro: "Die Zeiten sind grobe Schätzungen für einen ruhigen Klassenspaziergang.",
                stopLabel: "Station",
                coordLabel: "Koordinaten",
                walkLabel: "Laufzeit",
                stayLabel: "Aufenthalt",
                totalLabel: "Gesamtzeit ohne Pausen",
                stops: [
                    { id: "kirche", coords: [50.81641, 11.93326], stayMin: [20, 30], mapQuery: "Stadtkirche St. Mauritius Münchenbernsdorf", summary: "Hier könnt ihr Formen, Fenster und den Kirchturm vergleichen." },
                    { id: "rathaus", coords: [50.81586, 11.93406], stayMin: [15, 25], mapQuery: "Rathaus Münchenbernsdorf", summary: "Achtet auf die Fassade und überlegt, wofür ein Rathaus da ist." },
                    { id: "wasserschloss", coords: [50.81530, 11.93529], stayMin: [15, 20], mapQuery: "Burg Münch Wasserschloss Münchenbernsdorf", summary: "Sucht nach Hinweisen, die an die frühere Burg erinnern." },
                    { id: "teppichfabrik", coords: [50.81449, 11.93233], stayMin: [20, 30], mapQuery: "Historische Teppichfabrik Münchenbernsdorf", summary: "Hier geht es um Arbeit, Maschinen und die Geschichte der Stadt." },
                    { id: "seliger", coords: [50.81391, 11.93635], stayMin: [30, 45], mapQuery: "Holzmarkt Lichterpark Seliger Münchenbernsdorf", summary: "Zählt Holzfiguren oder beschreibt, welche Formen ihr entdeckt." }
                ]
            },
            feedback: {
                title: "Feedback & Kontakt",
                intro: "Schreibt kurz, was für eure Klasse noch hilfreich wäre.",
                name: "Name",
                email: "E-Mail",
                message: "Nachricht",
                messagePlaceholder: "Unsere Klasse wünscht sich...",
                challenge: "Sicherheitsfrage",
                submit: "Nachricht vorbereiten",
                success: "Danke! Dein E-Mail-Programm wurde vorbereitet.",
                spam: "Spam-Schutz aktiv: Bitte Formular erneut ausfüllen.",
                invalid: "Bitte alle Felder korrekt ausfüllen und Sicherheitsfrage lösen."
            }
        }
    };

    const getInitialLang = () => pageDefaultLang;

    const localizeValue = (el, key) => {
        if (!el) return "";
        return el.getAttribute(`data-${key}-${currentLang}`)
            || el.getAttribute(`data-${key}-${pageDefaultLang}`)
            || el.getAttribute(`data-${key}-de`)
            || "";
    };

    const trackEvent = (eventName, payload = {}) => {
        try {
            const raw = localStorage.getItem(STORAGE.analytics);
            const data = raw ? JSON.parse(raw) : { pageViews: {}, events: [] };

            const path = `${window.location.pathname}${window.location.hash}`;
            data.pageViews[path] = (data.pageViews[path] || 0) + (eventName === "page_view" ? 1 : 0);

            data.events.push({
                event: eventName,
                ts: new Date().toISOString(),
                path: window.location.pathname,
                lang: currentLang,
                payload,
            });

            if (data.events.length > 120) {
                data.events = data.events.slice(data.events.length - 120);
            }

            data.updatedAt = new Date().toISOString();
            localStorage.setItem(STORAGE.analytics, JSON.stringify(data));
        } catch {
            // no-op
        }
    };

    const fetchContent = async (lang) => {
        if (contentCache[lang]) return contentCache[lang];

        const fallback = fallbackContent[lang] || fallbackContent.de;
        const dataUrl = `${rootPrefix}/data/content.${lang}.json`;

        try {
            const res = await fetch(dataUrl);
            if (!res.ok) throw new Error("Bad response");
            const parsed = await res.json();
            contentCache[lang] = parsed;
            return parsed;
        } catch {
            contentCache[lang] = fallback;
            return fallback;
        }
    };

    const loadVisitedPlaces = () => {
        try {
            const raw = localStorage.getItem(STORAGE.visited);
            if (!raw) return new Set();
            const parsed = JSON.parse(raw);
            return new Set(Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : []);
        } catch {
            return new Set();
        }
    };

    let visitedPlaces = loadVisitedPlaces();

    const saveVisitedPlaces = () => {
        localStorage.setItem(STORAGE.visited, JSON.stringify(Array.from(visitedPlaces)));
    };

    const getAllPlaceIds = () => {
        const ids = new Set();
        placeCards.forEach((card) => { if (card.dataset.placeId) ids.add(card.dataset.placeId); });
        placeToggles.forEach((toggle) => { if (toggle.dataset.placeToggle) ids.add(toggle.dataset.placeToggle); });
        return Array.from(ids);
    };

    const applyTheme = (isDark) => {
        body.classList.toggle("dark", isDark);

        if (darkToggle) {
            darkToggle.setAttribute("aria-pressed", String(isDark));
            darkToggle.textContent = isDark ? "☀" : "🌙";
            darkToggle.title = isDark ? "Hellmodus aktivieren" : "Dunkelmodus aktivieren";
        }
    };

    const applyLanguage = (_lang = "de", options = {}) => {
        const persist = options.persist !== false;

        currentLang = "de";
        doc.documentElement.lang = "de";

        if (persist) {
            localStorage.removeItem("siteLang");
        }

        doc.querySelectorAll("[data-de]").forEach((el) => {
            const value = el.getAttribute("data-de");
            if (value !== null) el.textContent = value;
        });

        doc.querySelectorAll("[data-placeholder-de]").forEach((el) => {
            const value = el.getAttribute("data-placeholder-de");
            if (value !== null) el.setAttribute("placeholder", value);
        });

        doc.querySelectorAll("[data-title-de]").forEach((el) => {
            const value = el.getAttribute("data-title-de");
            if (value !== null) el.setAttribute("title", value);
        });

        doc.querySelectorAll("[data-aria-de]").forEach((el) => {
            const value = el.getAttribute("data-aria-de");
            if (value !== null) el.setAttribute("aria-label", value);
        });

        applyTheme(body.classList.contains("dark"));
        updateVisitExperience();
        updateMapUI();
        updateCardResults();

        if (dynamicTourState && typeof dynamicTourState.refreshLabels === "function") {
            dynamicTourState.refreshLabels();
        }
    };

    const closeMobileMenu = () => {
        if (!navLinks || !hamburger) return;
        navLinks.classList.remove("active", "show");
        hamburger.classList.remove("active");
        hamburger.setAttribute("aria-expanded", "false");
    };

    const updateVisitExperience = () => {
        const allIds = getAllPlaceIds();
        if (!allIds.length) return;

        const done = allIds.filter((id) => visitedPlaces.has(id)).length;
        const total = allIds.length;
        const visitedLabel = "Besucht";

        placeCards.forEach((card) => {
            const id = card.dataset.placeId;
            const isVisited = Boolean(id && visitedPlaces.has(id));
            card.classList.toggle("visited", isVisited);
            card.setAttribute("data-visited-label", isVisited ? visitedLabel : "");
        });

        placeToggles.forEach((toggle) => {
            const id = toggle.dataset.placeToggle;
            toggle.checked = Boolean(id && visitedPlaces.has(id));
        });

        if (visitProgressText) {
            const template = localizeValue(visitProgressText, "template")
                || "{done} von {total} Orten entdeckt.";

            visitProgressText.textContent = template
                .replace("{done}", String(done))
                .replace("{total}", String(total));
        }

        if (visitProgressBar) {
            const progress = total ? (done / total) * 100 : 0;
            visitProgressBar.style.width = `${progress}%`;
        }

        if (visitSuggestion) {
            if (done === total) {
                visitSuggestion.textContent = localizeValue(visitSuggestion, "complete");
            } else {
                visitSuggestion.textContent = localizeValue(visitSuggestion, "hint");
            }
        }
    };

    const markPlace = (placeId, isVisited) => {
        if (!placeId) return;
        if (isVisited) visitedPlaces.add(placeId);
        else visitedPlaces.delete(placeId);
        saveVisitedPlaces();
        updateVisitExperience();
    };

    const updateMapUI = () => {
        if (!mapContainer || !loadMapBtn) return;

        const isLoaded = mapContainer.dataset.loaded === "true";
        loadMapBtn.disabled = isLoaded;

        if (isLoaded) {
            loadMapBtn.textContent = "Karte geladen";
            loadMapBtn.setAttribute("aria-disabled", "true");
        } else {
            loadMapBtn.textContent = "Karte laden";
            loadMapBtn.removeAttribute("aria-disabled");
        }
    };

    const loadEmbeddedMap = () => {
        if (!mapContainer || mapContainer.dataset.loaded === "true") return;

        const src = mapContainer.getAttribute("data-map-src");
        if (!src) return;

        try {
            const iframe = doc.createElement("iframe");
            iframe.src = src;
            iframe.width = "100%";
            iframe.height = "420";
            iframe.loading = "lazy";
            iframe.allowFullscreen = true;
            iframe.referrerPolicy = "no-referrer-when-downgrade";
            iframe.style.border = "0";
            iframe.title = mapContainer.getAttribute("data-title-de") || "Karte von Münchenbernsdorf";

            // Error handling: Fallback if iframe fails to load
            iframe.addEventListener("error", () => {
                if (mapStatus) {
                    mapStatus.textContent = "Karte konnte nicht geladen werden. Versuchen Sie es später erneut.";
                    mapStatus.classList.add("warning");
                }
                trackEvent("map_error", { reason: "load_failed" });
            }, { once: true });

            mapContainer.innerHTML = "";
            mapContainer.appendChild(iframe);
            mapContainer.dataset.loaded = "true";

            if (mapStatus) {
                mapStatus.textContent = "Karte wurde geladen.";
                mapStatus.classList.remove("warning");
            }

            updateMapUI();
            trackEvent("map_loaded");
        } catch (err) {
            if (mapStatus) {
                mapStatus.textContent = "Fehler beim Laden der Karte. Bitte versuchen Sie es später erneut.";
                mapStatus.classList.add("warning");
            }
            trackEvent("map_error", { reason: "exception", error: String(err) });
        }
    };

    const haversineKm = (aLat, aLng, bLat, bLng) => {
        const toRad = (deg) => (deg * Math.PI) / 180;
        const R = 6371;
        const dLat = toRad(bLat - aLat);
        const dLng = toRad(bLng - aLng);
        const c1 = Math.sin(dLat / 2) ** 2;
        const c2 = Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
        return 2 * R * Math.asin(Math.sqrt(c1 + c2));
    };

    const updateCardResults = () => {
        if (!searchableCards.length) return;

        const query = (searchInput?.value || "").trim().toLowerCase();
        let visibleCount = 0;

        searchableCards.forEach((card) => {
            const text = (card.dataset.search || "").toLowerCase();
            const tags = (card.dataset.tags || "").toLowerCase().split(/\s+/).filter(Boolean);
            const matchesSearch = text.includes(query);
            const matchesFilter = activeVisitorFilter === "all" || tags.includes(activeVisitorFilter);
            const visible = matchesSearch && matchesFilter;

            card.style.display = visible ? "block" : "none";
            if (visible) visibleCount += 1;
        });

        if (noResults) {
            noResults.classList.toggle("show", visibleCount === 0);
        }
    };

    const setCardImageResponsive = (img, baseName) => {
        if (!img || !baseName) return;

        const hasSrcset = (img.getAttribute("srcset") || "").trim().length > 0;
        const hasSizes = (img.getAttribute("sizes") || "").trim().length > 0;

        // Performance: JS soll nicht unnötig srcset/sizes überschreiben.
        // Wir setzen Responsive-Angaben nur, wenn noch nichts vorhanden ist.
        if (hasSrcset && hasSizes) {
            img.loading = img.loading || "lazy";
            img.decoding = img.decoding || "async";
            return;
        }

        const imagePrefix = isEnPath ? "../images" : "images";
        const basePath = `${imagePrefix}/${baseName}.jpg`;
        const src480 = `${imagePrefix}/${baseName}-480.jpg`;
        const src768 = `${imagePrefix}/${baseName}-768.jpg`;

        img.src = basePath;
        img.setAttribute("srcset", `${src480} 480w, ${src768} 768w, ${basePath} 1200w`);
        img.setAttribute("sizes", "(max-width: 640px) 92vw, (max-width: 1100px) 46vw, 360px");
        img.loading = img.loading || "lazy";
        img.decoding = img.decoding || "async";
    };

    const applyPlaceContent = (content) => {
        if (!content || !content.places) return;

        placeCards.forEach((card, idx) => {
            const placeId = card.dataset.placeId;
            const place = content.places[placeId];
            if (!place) return;

            card.dataset.search = place.search || card.dataset.search || "";
            card.dataset.tags = Array.isArray(place.tags) ? place.tags.join(" ") : (card.dataset.tags || "");

            const heading = card.querySelector("h3");
            if (heading) {
                heading.textContent = place.name;
            }

            const text = card.querySelector("p");
            if (text && place.cardSummary) {
                text.textContent = place.cardSummary;
            }

            const image = card.querySelector("img");
            if (image) {
                setCardImageResponsive(image, place.image);
                if (idx === 0) image.setAttribute("fetchpriority", "high");
            }
        });

        updateCardResults();
    };

    const ensureVisitorFilterUI = (content) => {
        if (!isHomePage) return;

        const targetSection = doc.getElementById("attractions");
        const cardsWrap = targetSection?.querySelector(".cards");
        if (!cardsWrap) return;

        let filterWrap = targetSection.querySelector(".visitor-filter");
        if (!filterWrap) {
            filterWrap = doc.createElement("div");
            filterWrap.className = "visitor-filter";
            cardsWrap.before(filterWrap);
        }

        const modes = content?.visitorModes || fallbackContent[currentLang].visitorModes;
        const label = "Entdeckermodus:";

        filterWrap.innerHTML = `
            <p class="filter-label">${label}</p>
            <div class="filter-buttons">
                ${modes.map((mode) => `<button type="button" class="filter-chip${mode.id === activeVisitorFilter ? " active" : ""}" data-visitor-filter="${mode.id}" aria-pressed="${mode.id === activeVisitorFilter}">${mode.label}</button>`).join("")}
            </div>
        `;

        filterWrap.querySelectorAll("[data-visitor-filter]").forEach((button) => {
            button.addEventListener("click", () => {
                activeVisitorFilter = button.dataset.visitorFilter || "all";
                // Save filter selection to localStorage
                try {
                    localStorage.setItem(STORAGE.visitorFilter, activeVisitorFilter);
                } catch {
                    // Storage quota exceeded or private browsing
                }
                ensureVisitorFilterUI(content);
                updateCardResults();
                trackEvent("filter_select", { filter: activeVisitorFilter });
            });
        });
    };


    // Entdeckerkarte-Tour komplett deaktiviert
    const ensureTourSection = (_content) => {
        if (!tourSection) {
            tourSection = doc.createElement("section");
            tourSection.id = "tour";
            tourSection.className = "section reveal";
            mapSection.before(tourSection);
        }

        const stops = content.tour.stops || [];
        if (!stops.length) return;

        const points = [
            "15,20", "36,25", "58,48", "36,72", "73,82"
        ];

        const rows = stops.map((stop, index) => {
            const prev = stops[index - 1];
            let walkMin = 0;
            if (prev) {
                const km = haversineKm(prev.coords[0], prev.coords[1], stop.coords[0], stop.coords[1]);
                walkMin = Math.max(2, Math.round((km / 4.5) * 60));
            }
            const stay = `${stop.stayMin[0]}-${stop.stayMin[1]} min`;
            return { ...stop, walkMin, stay };
        });

        const totalWalk = rows.reduce((sum, row) => sum + row.walkMin, 0);

        tourSection.innerHTML = `
            <h2>${content.tour.title}</h2>
            <p>${content.tour.intro}</p>
            <div class="tour-grid">
                <div class="tour-stage" aria-label="Tourkarte">
                    <svg class="tour-track" viewBox="0 0 100 100" aria-hidden="true"><polyline points="${points.join(" ")}"></polyline></svg>
                    ${rows.map((row, idx) => `<button type="button" class="tour-pin${idx === 0 ? " active" : ""}" data-tour-stop="${row.id}" style="left:${points[idx].split(",")[0]}%; top:${points[idx].split(",")[1]}%;">${idx + 1}</button>`).join("")}
                </div>
                <aside class="tour-panel light">
                    <h3 id="tourTitle">${content.places[rows[0].id].name}</h3>
                    <p id="tourSummary">${rows[0].summary}</p>
                    <p id="tourCoord" class="tour-coord">${content.tour.coordLabel}: ${rows[0].coords[0].toFixed(5)}, ${rows[0].coords[1].toFixed(5)}</p>
                    <p id="tourDuration" class="tour-duration">${content.tour.stayLabel}: ${rows[0].stay}</p>
                    <a id="tourMapLink" class="ghost-btn" target="_blank" rel="noopener noreferrer" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(rows[0].mapQuery)}">${content.tour.openMap}</a>
                    <h4 class="tour-subtitle">${content.tour.routeTitle}</h4>
                    <p class="tour-route-intro">${content.tour.routeIntro}</p>
                    <div class="tour-table-wrap">
                        <table class="tour-table">
                            <thead>
                                <tr><th>${content.tour.stopLabel}</th><th>${content.tour.coordLabel}</th><th>${content.tour.walkLabel}</th><th>${content.tour.stayLabel}</th></tr>
                            </thead>
                            <tbody>
                                ${rows.map((row, idx) => `<tr data-tour-jump="${row.id}" class="${idx === 0 ? "active" : ""}"><td>${idx + 1}. ${content.places[row.id].name}</td><td>${row.coords[0].toFixed(5)}, ${row.coords[1].toFixed(5)}</td><td>${row.walkMin ? `${row.walkMin} min` : "-"}</td><td>${row.stay}</td></tr>`).join("")}
                            </tbody>
                        </table>
                    </div>
                    <p class="tour-total">${content.tour.totalLabel}: ${totalWalk} min</p>
                </aside>
            </div>
        `;

        if (navLinks && !navLinks.querySelector('a[href="#tour"]')) {
            const mapLink = navLinks.querySelector('a[href="#karte"], a[href="#map"]');
            const link = doc.createElement("a");
            link.href = "#tour";
            link.textContent = "Entdeckerkarte";
            if (mapLink) mapLink.before(link);
            else navLinks.appendChild(link);
        }

        const pins = Array.from(tourSection.querySelectorAll(".tour-pin"));
        const rowsEls = Array.from(tourSection.querySelectorAll("tbody tr[data-tour-jump]"));
        const titleEl = tourSection.querySelector("#tourTitle");
        const summaryEl = tourSection.querySelector("#tourSummary");
        const coordEl = tourSection.querySelector("#tourCoord");
        const durationEl = tourSection.querySelector("#tourDuration");
        const mapLinkEl = tourSection.querySelector("#tourMapLink");

        const setActive = (placeId, scrollToCard = false) => {
            const idx = rows.findIndex((row) => row.id === placeId);
            if (idx < 0) return;
            const row = rows[idx];

            pins.forEach((pin, pIdx) => pin.classList.toggle("active", pIdx === idx));
            rowsEls.forEach((tr, tIdx) => tr.classList.toggle("active", tIdx === idx));

            titleEl.textContent = content.places[row.id].name;
            summaryEl.textContent = row.summary;
            coordEl.textContent = `${content.tour.coordLabel}: ${row.coords[0].toFixed(5)}, ${row.coords[1].toFixed(5)}`;
            durationEl.textContent = `${content.tour.stayLabel}: ${row.stay}`;
            mapLinkEl.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(row.mapQuery)}`;

            if (scrollToCard) {
                const card = doc.querySelector(`.card[data-place-id="${placeId}"]`);
                if (card) {
                    const navOffset = nav ? nav.offsetHeight + 10 : 0;
                    const top = card.getBoundingClientRect().top + window.scrollY - navOffset;
                    window.scrollTo({ top, behavior: prefersReducedMotion ? "auto" : "smooth" });
                    card.classList.remove("suggested");
                    void card.offsetWidth;
                    card.classList.add("suggested");
                    window.setTimeout(() => card.classList.remove("suggested"), 1200);
                }
            }

            trackEvent("tour_stop", { place: placeId });
        };

        pins.forEach((pin) => {
            pin.addEventListener("click", () => setActive(pin.dataset.tourStop, true));
        });

        rowsEls.forEach((rowEl) => {
            rowEl.tabIndex = 0;
            rowEl.addEventListener("click", () => setActive(rowEl.dataset.tourJump, true));
            rowEl.addEventListener("keydown", (event) => {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setActive(rowEl.dataset.tourJump, true);
                }
            });
        });

        dynamicTourState = {
            refreshLabels: () => ensureTourSection(content),
            setActive,
        };
    };

    const ensureFeedbackSection = (content) => {
        if (!isHomePage || !content?.feedback) return;

        const main = doc.getElementById("main-content");
        const mapSection = doc.querySelector("#karte, #map");
        if (!main || !mapSection || doc.getElementById("feedback")) return;

        const a = Math.floor(Math.random() * 6) + 2;
        const b = Math.floor(Math.random() * 6) + 3;
        const startedAt = Date.now();

        const section = doc.createElement("section");
        section.id = "feedback";
        section.className = "section light reveal feedback-section";
        section.innerHTML = `
            <h2>${content.feedback.title}</h2>
            <p>${content.feedback.intro}</p>
            <form id="feedbackForm" class="feedback-form" novalidate>
                <div class="form-row">
                    <label for="fbName">${content.feedback.name}</label>
                    <input id="fbName" name="name" type="text" autocomplete="name" required minlength="2" maxlength="100">
                    <span class="form-error" aria-live="polite"></span>
                </div>
                <div class="form-row">
                    <label for="fbEmail">${content.feedback.email}</label>
                    <input id="fbEmail" name="email" type="email" autocomplete="email" required maxlength="200">
                    <span class="form-error" aria-live="polite"></span>
                </div>
                <div class="form-row">
                    <label for="fbMessage">${content.feedback.message}</label>
                    <textarea id="fbMessage" name="message" rows="5" placeholder="${content.feedback.messagePlaceholder}" required minlength="10" maxlength="1000"></textarea>
                    <span class="form-error" aria-live="polite"></span>
                </div>
                <div class="form-row hp-field" aria-hidden="true">
                    <label for="fbWebsite">Website</label>
                    <input id="fbWebsite" name="website" type="text" tabindex="-1" autocomplete="off">
                </div>
                <div class="form-row challenge-row">
                    <label for="fbChallenge">${content.feedback.challenge}: ${a} + ${b} = ?</label>
                    <input id="fbChallenge" name="challenge" type="number" inputmode="numeric" required>
                    <span class="form-error" aria-live="polite"></span>
                </div>
                <div class="feedback-actions">
                    <button type="submit" class="btn">${content.feedback.submit}</button>
                </div>
                <p id="feedbackStatus" class="info-note" aria-live="polite"></p>
            </form>
        `;

        // Add to page
        main.appendChild(section);

        const form = section.querySelector("#feedbackForm");
        const status = section.querySelector("#feedbackStatus");
        const formInputs = form.querySelectorAll("input, textarea");

        // Real-time validation feedback
        formInputs.forEach((input) => {
            const errorSpan = input.nextElementSibling;
            if (!errorSpan || !errorSpan.classList.contains("form-error")) return;

            input.addEventListener("blur", () => {
                const error = validateInput(input);
                if (error) {
                    errorSpan.textContent = error;
                    errorSpan.style.display = "block";
                    input.classList.add("has-error");
                } else {
                    errorSpan.textContent = "";
                    errorSpan.style.display = "none";
                    input.classList.remove("has-error");
                }
            });
        });

        form?.addEventListener("submit", (event) => {
            event.preventDefault();

            const fd = new FormData(form);
            const name = String(fd.get("name") || "").trim();
            const email = String(fd.get("email") || "").trim();
            const message = String(fd.get("message") || "").trim();
            const website = String(fd.get("website") || "").trim();
            const challenge = Number(fd.get("challenge"));
            const elapsed = Date.now() - startedAt;

            // Spam protection
            if (website || elapsed < 3000) {
                status.textContent = content.feedback.spam;
                status.classList.add("warning");
                trackEvent("feedback_blocked", { reason: "honeypot_or_too_fast" });
                return;
            }

            // Comprehensive validation
            const errors = [];
            if (name.length < 2) errors.push("Name muss mindestens 2 Zeichen lang sein.");
            if (!isValidEmail(email)) errors.push("Bitte geben Sie eine gültige E-Mail ein.");
            if (message.length < 10) errors.push("Nachricht muss mindestens 10 Zeichen lang sein.");
            if (message.length > 1000) errors.push("Nachricht darf maximal 1000 Zeichen lang sein.");
            if (challenge !== a + b) errors.push("Sicherheitsfrage wurde nicht korrekt beantwortet.");

            if (errors.length > 0) {
                status.textContent = errors.join(" ");
                status.classList.add("warning");
                trackEvent("feedback_invalid", { errors: errors.length });
                return;
            }

            // Encode safely
            const subject = encodeURIComponent("Feedback zur Münchenbernsdorf-Website");
            const sanitizedName = sanitizeString(name);
            const sanitizedEmail = sanitizeString(email);
            const sanitizedMessage = sanitizeString(message);
            const bodyText = `Name: ${sanitizedName}\nE-Mail: ${sanitizedEmail}\n\n${sanitizedMessage}`;
            const mailBody = encodeURIComponent(bodyText);
            
            try {
                window.location.href = `mailto:lahnemil11@gmail.com?subject=${subject}&body=${mailBody}`;
                status.textContent = content.feedback.success;
                status.classList.remove("warning");
                trackEvent("feedback_submit");
                form.reset();
            } catch (err) {
                status.textContent = "Fehler beim Öffnen des E-Mail-Programms.";
                status.classList.add("warning");
                trackEvent("feedback_error", { reason: "mailto_failed" });
            }
        });
    };

    /**
     * Validates a single form input
     * @param {HTMLElement} input - The input element to validate
     * @returns {string} Error message, or empty string if valid
     */
    const validateInput = (input) => {
        const value = String(input.value || "").trim();
        const name = input.name;

        switch (name) {
            case "name":
                if (value.length < 2) return "Mindestens 2 Zeichen erforderlich.";
                if (value.length > 100) return "Maximal 100 Zeichen erlaubt.";
                break;
            case "email":
                if (!isValidEmail(value)) return "Ungültige E-Mail-Adresse.";
                if (value.length > 200) return "E-Mail zu lang.";
                break;
            case "message":
                if (value.length < 10) return "Mindestens 10 Zeichen erforderlich.";
                if (value.length > 1000) return "Maximal 1000 Zeichen erlaubt.";
                break;
            case "challenge":
                // Validation happens on submit
                break;
        }
        return "";
    };

    /**
     * Validates email format
     * @param {string} email - Email to validate
     * @returns {boolean} True if valid email
     */
    const isValidEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email) && email.length <= 200;
    };

    /**
     * Sanitizes a string for safe mailto encoding
     * @param {string} str - String to sanitize
     * @returns {string} Sanitized string
     */
    const sanitizeString = (str) => {
        return String(str || "")
            .trim()
            .slice(0, 500)
            .replace(/[<>]/g, "")
            .replace(/\n\n\n+/g, "\n\n");
    };

    const ensureDetailEnhancements = (content) => {
        if (!isDetailPage) return;

        const mapFromClass = {
            "kirche-page": "kirche",
            "rathaus-page": "rathaus",
            "teppich-page": "teppichfabrik",
            "wasserschloss-page": "wasserschloss",
            "seliger-page": "seliger",
        };

        const bodyClass = Object.keys(mapFromClass).find((cls) => body.classList.contains(cls));
        const placeId = bodyClass ? mapFromClass[bodyClass] : null;
        const place = placeId ? content.places[placeId] : null;
        const visitSection = doc.querySelector("#besuch, #visit");

        doc.querySelectorAll(".timeline").forEach((list) => {
            list.classList.add("timeline-block");
        });

        if (place && visitSection && !doc.querySelector(".media-section")) {
            const imagePrefix = isEnPath ? "../images" : "images";
            const base = `${imagePrefix}/${place.image}`;

            const media = doc.createElement("section");
            media.className = "section info-section reveal media-section";
            media.innerHTML = `
                <h2>Medien</h2>
                <p>Zusätzliche Ansichten der Sehenswürdigkeit.</p>
                <div class="media-grid" data-stagger>
                    <figure class="media-item">
                        <img src="${base}.jpg" srcset="${base}-480.jpg 480w, ${base}-768.jpg 768w, ${base}.jpg 1200w" sizes="(max-width: 700px) 92vw, 46vw" loading="lazy" decoding="async" alt="${place.name}">
                        <figcaption>Panorama: ${place.name}</figcaption>
                    </figure>
                    <figure class="media-item">
                        <img src="${base}.jpg" srcset="${base}-480.jpg 480w, ${base}-768.jpg 768w, ${base}.jpg 1200w" sizes="(max-width: 700px) 92vw, 46vw" loading="lazy" decoding="async" alt="${place.name}">
                        <figcaption>Detail: ${place.name}</figcaption>
                    </figure>
                </div>
            `;

            const audio = doc.createElement("section");
            audio.className = "section light reveal audio-guide";
            audio.innerHTML = `
                <h2>Audioguide</h2>
                <p class="audio-source">${place.name}. ${place.cardSummary}</p>
                <div class="audio-controls">
                    <button type="button" class="btn" data-audio-action="play">Audioguide starten</button>
                    <button type="button" class="ghost-btn" data-audio-action="stop">Stoppen</button>
                    <button type="button" class="ghost-btn" data-print-action="print">Infoblatt drucken</button>
                </div>
                <p class="info-note audio-status" aria-live="polite"></p>
            `;

            visitSection.before(audio);
            visitSection.before(media);

            const status = audio.querySelector(".audio-status");
            const play = audio.querySelector("[data-audio-action='play']");
            const stop = audio.querySelector("[data-audio-action='stop']");
            const printBtn = audio.querySelector("[data-print-action='print']");
            const source = audio.querySelector(".audio-source")?.textContent?.trim() || "";

            if (!("speechSynthesis" in window)) {
                if (status) status.textContent = "Audioguide wird in diesem Browser nicht unterstützt.";
                if (play) play.disabled = true;
                if (stop) stop.disabled = true;
            } else {
                if (status) status.textContent = "Audioguide bereit.";
                play?.addEventListener("click", () => {
                    window.speechSynthesis.cancel();
                    const utter = new SpeechSynthesisUtterance(source);
                    utter.lang = "de-DE";
                    utter.rate = 0.95;
                    utter.onstart = () => { if (status) status.textContent = "Audioguide läuft."; };
                    utter.onend = () => { if (status) status.textContent = "Audioguide beendet."; };
                    utter.onerror = () => { if (status) status.textContent = "Audioguide konnte nicht gestartet werden."; };
                    window.speechSynthesis.speak(utter);
                    trackEvent("audio_play", { place: placeId });
                });
                stop?.addEventListener("click", () => {
                    window.speechSynthesis.cancel();
                    if (status) status.textContent = "Audioguide gestoppt.";
                    trackEvent("audio_stop", { place: placeId });
                });
            }

            printBtn?.addEventListener("click", () => {
                window.print();
                trackEvent("print_info", { place: placeId });
            });
        }
    };

    const setupPwa = () => {
        if (!doc.head.querySelector('link[rel="manifest"]')) {
            const manifest = doc.createElement("link");
            manifest.rel = "manifest";
            manifest.href = `${rootPrefix}/manifest.json`;
            doc.head.appendChild(manifest);
        }

        if (!doc.head.querySelector('link[rel="icon"]')) {
            const icon = doc.createElement("link");
            icon.rel = "icon";
            icon.type = "image/png";
            icon.href = `${rootPrefix}/images/icon-192.png`;
            doc.head.appendChild(icon);
        }

        if ("serviceWorker" in navigator) {
            window.addEventListener("load", () => {
                navigator.serviceWorker.register(`${rootPrefix}/service-worker.js`).catch(() => {
                    // no-op
                });
            });
        }
    };

    const setupMotion = () => {
        body.classList.add("js-on");

        const revealElements = doc.querySelectorAll(".reveal, .fade-in, .reveal-text, .fade-up");
        const staggerGroups = doc.querySelectorAll("[data-stagger], .cards, .info-grid, .plan-grid, .related-links, .visit-checklist");

        if (prefersReducedMotion || typeof IntersectionObserver === "undefined") {
            revealElements.forEach((el) => el.classList.add("visible"));
            staggerGroups.forEach((el) => el.classList.add("stagger-visible"));
            return;
        }

        const revealObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add("visible");
                observer.unobserve(entry.target);
            });
        }, { threshold: 0.12 });
        revealElements.forEach((el) => revealObserver.observe(el));

        const staggerObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add("stagger-visible");
                observer.unobserve(entry.target);
            });
        }, { threshold: 0.08 });
        staggerGroups.forEach((el) => {
            if (!el.hasAttribute("data-stagger")) el.setAttribute("data-stagger", "");
            staggerObserver.observe(el);
        });
    };

    const setupNavigation = () => {
        if (hamburger && navLinks) {
            hamburger.addEventListener("click", () => {
                const isOpen = navLinks.classList.toggle("active");
                navLinks.classList.toggle("show", isOpen);
                hamburger.classList.toggle("active", isOpen);
                hamburger.setAttribute("aria-expanded", String(isOpen));
            });

            doc.addEventListener("click", (event) => {
                if (!navLinks.classList.contains("active")) return;
                if (navLinks.contains(event.target) || hamburger.contains(event.target)) return;
                closeMobileMenu();
            });

            doc.addEventListener("keydown", (event) => {
                if (event.key === "Escape") closeMobileMenu();
            });
        }

        doc.querySelectorAll('a[href^="#"]').forEach((anchor) => {
            anchor.addEventListener("click", (event) => {
                const id = anchor.getAttribute("href");
                if (!id || id.length < 2) return;
                const target = doc.querySelector(id);
                if (!target) return;

                event.preventDefault();
                const navOffset = nav ? nav.offsetHeight + 10 : 0;
                const top = target.getBoundingClientRect().top + window.scrollY - navOffset;

                window.scrollTo({ top, behavior: prefersReducedMotion ? "auto" : "smooth" });
                if (history.pushState) history.pushState(null, "", id);
                closeMobileMenu();
            });
        });

        const navAnchors = Array.from(doc.querySelectorAll('.nav-links a[href^="#"]'));
        const onScroll = () => {
            if (!prefersReducedMotion && hero) {
                hero.style.backgroundPositionY = `${window.scrollY * 0.35}px`;
            }

            const scrollPos = window.scrollY + (nav ? nav.offsetHeight + 40 : 140);
            let active = null;
            navAnchors.forEach((link) => {
                const section = doc.querySelector(link.getAttribute("href"));
                if (section && section.offsetTop <= scrollPos) active = link;
            });
            navAnchors.forEach((link) => {
                const isActive = link === active;
                link.classList.toggle("active", isActive);
                if (isActive) link.setAttribute("aria-current", "page");
                else link.removeAttribute("aria-current");
            });

            if (nav) nav.classList.toggle("scrolled", window.scrollY > 40);
            if (scrollBtn) scrollBtn.classList.toggle("show", window.scrollY > 300);
        };

        window.addEventListener("scroll", onScroll, { passive: true });
        window.addEventListener("load", onScroll);

        if (scrollBtn) {
            scrollBtn.addEventListener("click", () => {
                window.scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" });
            });
        }
    };

    const setupInteractions = () => {
        if (searchInput) searchInput.addEventListener("input", updateCardResults);
        if (clearSearch && searchInput) {
            clearSearch.addEventListener("click", () => {
                searchInput.value = "";
                updateCardResults();
                searchInput.focus();
            });
        }

        placeToggles.forEach((toggle) => {
            toggle.addEventListener("change", () => markPlace(toggle.dataset.placeToggle, toggle.checked));
        });

        placeCards.forEach((card) => {
            card.addEventListener("click", () => {
                const placeId = card.dataset.placeId;
                if (!placeId) return;
                markPlace(placeId, true);
                if (dynamicTourState) dynamicTourState.setActive(placeId, false);
            }, { passive: true });
        });

        if (suggestPlaceBtn) {
            suggestPlaceBtn.addEventListener("click", () => {
                const all = getAllPlaceIds();
                const remaining = all.filter((id) => !visitedPlaces.has(id));

                if (!remaining.length) {
                    if (visitSuggestion) visitSuggestion.textContent = localizeValue(visitSuggestion, "complete");
                    return;
                }

                const nextId = remaining[Math.floor(Math.random() * remaining.length)];
                const nextCard = placeCards.find((card) => card.dataset.placeId === nextId);

                if (visitSuggestion) {
                    const template = localizeValue(visitSuggestion, "next") || "Nächstes Ziel: {name}";
                    const name = nextCard?.querySelector("h3")?.textContent?.trim() || nextId;
                    visitSuggestion.textContent = template.replace("{name}", name);
                }

                if (searchInput) searchInput.value = "";
                activeVisitorFilter = "all";
                updateCardResults();
                markPlace(nextId, true);
                if (dynamicTourState) dynamicTourState.setActive(nextId, true);
            });
        }

        if (resetVisitedBtn) {
            resetVisitedBtn.addEventListener("click", () => {
                visitedPlaces = new Set();
                saveVisitedPlaces();
                updateVisitExperience();
                if (visitSuggestion) visitSuggestion.textContent = localizeValue(visitSuggestion, "reset");
            });
        }

        if (loadMapBtn) {
            loadMapBtn.addEventListener("click", loadEmbeddedMap);
        }
    };

    const setupQuiz = () => {
        if (!quizProgress || !quizQuestion || !quizAnswers || !quizFeedback || !nextQuizBtn || !restartQuizBtn) {
            return;
        }

        let quizIndex = 0;
        let quizScore = 0;
        let answered = false;

        const renderQuestion = () => {
            const item = quizQuestions[quizIndex];
            if (!item) return;

            answered = false;
            quizProgress.textContent = `Frage ${quizIndex + 1} von ${quizQuestions.length}`;
            quizQuestion.textContent = item.question;
            quizFeedback.textContent = "";
            quizFeedback.className = "quiz-feedback";
            quizAnswers.innerHTML = "";

            item.answers.forEach((answer, answerIndex) => {
                const button = doc.createElement("button");
                button.type = "button";
                button.className = "quiz-answer";
                button.textContent = answer;
                button.setAttribute("aria-pressed", "false");
                button.addEventListener("click", () => handleAnswer(button, answerIndex));
                quizAnswers.appendChild(button);
            });

            nextQuizBtn.disabled = true;
            nextQuizBtn.hidden = false;
            nextQuizBtn.textContent = quizIndex === quizQuestions.length - 1 ? "Ergebnis anzeigen" : "Nächste Frage";
            restartQuizBtn.textContent = "Neu starten";
        };

        const handleAnswer = (selectedButton, answerIndex) => {
            if (answered) return;

            const item = quizQuestions[quizIndex];
            const isCorrect = answerIndex === item.correct;
            answered = true;

            if (isCorrect) quizScore += 1;

            Array.from(quizAnswers.querySelectorAll(".quiz-answer")).forEach((button, index) => {
                button.disabled = true;
                button.setAttribute("aria-pressed", String(button === selectedButton));
                button.classList.toggle("is-correct", index === item.correct);
                button.classList.toggle("is-wrong", button === selectedButton && !isCorrect);
            });

            quizFeedback.textContent = isCorrect ? item.detail : `Fast! ${item.detail}`;
            quizFeedback.classList.toggle("is-correct", isCorrect);
            quizFeedback.classList.toggle("is-wrong", !isCorrect);
            nextQuizBtn.disabled = false;
            trackEvent("quiz_answer", { question: quizIndex + 1, correct: isCorrect });
        };

        const renderResult = () => {
            quizProgress.textContent = "Quiz geschafft";
            quizQuestion.textContent = `${quizScore} von ${quizQuestions.length} Antworten richtig`;
            quizAnswers.innerHTML = `<p class="quiz-result">Du hast Münchenbernsdorf schon gut erkundet. Schau dir bei der nächsten Runde die Orte noch einmal ganz genau an.</p>`;
            quizFeedback.textContent = quizScore === quizQuestions.length
                ? "Super! Du bist ein Münchenbernsdorf-Profi."
                : "Gut gemacht! Beim nächsten Durchgang kannst du noch mehr Punkte sammeln.";
            quizFeedback.className = "quiz-feedback is-correct";
            nextQuizBtn.hidden = true;
            restartQuizBtn.textContent = "Quiz nochmal spielen";
            trackEvent("quiz_complete", { score: quizScore, total: quizQuestions.length });
        };

        nextQuizBtn.addEventListener("click", () => {
            if (!answered) return;

            if (quizIndex < quizQuestions.length - 1) {
                quizIndex += 1;
                renderQuestion();
                return;
            }

            renderResult();
        });

        restartQuizBtn.addEventListener("click", () => {
            quizIndex = 0;
            quizScore = 0;
            renderQuestion();
            trackEvent("quiz_restart");
        });

        renderQuestion();
    };

    const setupSeoEnhancements = () => {
        if (!doc.head.querySelector('meta[name="robots"]')) {
            const robots = doc.createElement("meta");
            robots.name = "robots";
            robots.content = "index,follow,max-image-preview:large";
            doc.head.appendChild(robots);
        }

        if (!doc.head.querySelector('meta[property="og:image:alt"]')) {
            const meta = doc.createElement("meta");
            meta.setAttribute("property", "og:image:alt");
            meta.content = "Orte in Münchenbernsdorf für Grundschüler";
            doc.head.appendChild(meta);
        }
    };

    // === FEATURE: Achievements & Gamification System ===
    const achievements = {
        first_visit: { title: "Entdecker", icon: "🔍", description: "Erster Ort besucht" },
        all_places: { title: "Meister", icon: "👑", description: "Alle Orte entdeckt" },
        perfect_quiz: { title: "Gelehrter", icon: "📚", description: "Quiz perfekt gelöst" },
        speed_runner: { title: "Sprinter", icon: "⚡", description: "Schnelle Erkundung" },
        helper: { title: "Helfer", icon: "💬", description: "Feedback gegeben" },
    };

    const loadAchievements = () => {
        try {
            const raw = localStorage.getItem(STORAGE.achievements);
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    };

    const saveAchievements = (achList) => {
        try {
            localStorage.setItem(STORAGE.achievements, JSON.stringify(achList));
        } catch { }
    };

    let unlockedAchievements = loadAchievements();

    const unlockAchievement = (achId) => {
        if (unlockedAchievements.includes(achId)) return;
        unlockedAchievements.push(achId);
        saveAchievements(unlockedAchievements);
        showAchievementNotification(achId);
        trackEvent("achievement_unlock", { achievement: achId });
    };

    const showAchievementNotification = (achId) => {
        const ach = achievements[achId];
        if (!ach) return;

        const notif = doc.createElement("div");
        notif.className = "achievement-notification";
        notif.innerHTML = `
            <div class="achievement-inner">
                <span class="achievement-icon">${ach.icon}</span>
                <div class="achievement-text">
                    <p class="achievement-title">${ach.title}</p>
                    <p class="achievement-desc">${ach.description}</p>
                </div>
            </div>
        `;
        doc.body.appendChild(notif);

        setTimeout(() => notif.classList.add("show"), 50);
        setTimeout(() => {
            notif.classList.remove("show");
            setTimeout(() => notif.remove(), 300);
        }, 3500);
    };

    // === FEATURE: Social Sharing & Progress Export ===
    const shareVisitedPlaces = () => {
        const visited = Array.from(visitedPlaces).filter(id => fallbackContent.de.places[id]);
        const names = visited.map(id => fallbackContent.de.places[id].name).join(", ");
        const score = unlockedAchievements.length;
        const text = `Ich habe ${names} in Münchenbernsdorf entdeckt und ${score} Abzeichen verdient! 🎉 Komm mit auf Entdeckertour: `;
        
        if (navigator.share) {
            navigator.share({
                title: "Münchenbernsdorf Entdeckertour",
                text: text,
                url: window.location.origin
            }).catch(() => { });
        } else {
            const encodedText = encodeURIComponent(text + window.location.origin);
            window.open(`https://wa.me/?text=${encodedText}`, "_blank");
        }
        trackEvent("social_share");
    };

    const exportProgress = () => {
        const data = {
            visitedPlaces: Array.from(visitedPlaces),
            achievements: unlockedAchievements,
            exportDate: new Date().toISOString(),
            version: "1.0"
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = doc.createElement("a");
        a.href = url;
        a.download = `muenchenbernsdorf-progress-${Date.now()}.json`;
        doc.body.appendChild(a);
        a.click();
        doc.body.removeChild(a);
        URL.revokeObjectURL(url);

        trackEvent("progress_export");
    };


    // === FEATURE: Quiz Difficulty Levels ===
    const quizDifficulties = {
        easy: { label: "Leicht", multiplier: 1, count: 3 },
        medium: { label: "Mittel", multiplier: 1.5, count: 4 },
        hard: { label: "Schwer", multiplier: 2, count: 5 }
    };

    const getSelectedDifficulty = () => {
        return localStorage.getItem(STORAGE.quizDifficulty) || "medium";
    };

    const setQuizDifficulty = (level) => {
        localStorage.setItem(STORAGE.quizDifficulty, level);
        trackEvent("quiz_difficulty_set", { level });
    };

    // === FEATURE: Offline Content UI ===
    const setupOfflineUI = () => {
        if (!navigator.serviceWorker) return;

        const statusDiv = doc.createElement("div");
        statusDiv.className = "offline-status";
        statusDiv.setAttribute("aria-live", "polite");
        statusDiv.innerHTML = `
            <div class="offline-indicator">
                <span class="sync-status">✓ Online bereit</span>
                <progress id="syncProgress" max="100" value="90"></progress>
            </div>
        `;

        doc.body.insertBefore(statusDiv, doc.body.firstChild);

        window.addEventListener("online", () => {
            statusDiv.querySelector(".sync-status").textContent = "✓ Online bereit";
            statusDiv.classList.remove("offline");
            trackEvent("connectivity_online");
        });

        window.addEventListener("offline", () => {
            statusDiv.querySelector(".sync-status").textContent = "⊗ Im Offline-Modus";
            statusDiv.classList.add("offline");
            trackEvent("connectivity_offline");
        });
    };

    // === FEATURE: Enhanced Analytics with Plausible ===
    const trackEventEnhanced = (eventName, payload = {}) => {
        // Local analytics
        trackEvent(eventName, payload);

        // Plausible analytics (if available)
        if (window.plausible) {
            window.plausible(eventName, { props: payload });
        }
    };

    // === FEATURE: Mobile Shortcuts ===
    const setupMobileShortcuts = () => {
        if (!navigator.serviceWorker || !doc.querySelector('link[rel="manifest"]')) return;

        // Shortcuts are defined in manifest.json
        // This function ensures they work properly
        navigator.serviceWorker.ready.then(() => {
            trackEvent("pwa_ready");
        });
    };

    const setupBreadcrumbNavigation = () => {
        const breadcrumbs = doc.querySelector('.breadcrumbs');
        if (!breadcrumbs) return;
        
        // Map of page classes to breadcrumb text
        const pageBreadcrumbs = {
            'kirche-page': 'Stadtkirche St. Mauritius',
            'rathaus-page': 'Rathaus',
            'wasserschloss-page': 'Wasserschloss',
            'teppich-page': 'Alte Teppichfabrik',
            'seliger-page': 'Seliger Benedikt'
        };
        
        // Find active page
        let breadcrumbText = 'Details';
        for (const [className, text] of Object.entries(pageBreadcrumbs)) {
            if (body.classList.contains(className)) {
                breadcrumbText = text;
                break;
            }
        }
        
        // Update breadcrumb current page
        const currentPageBreadcrumb = breadcrumbs.querySelector('span:last-of-type');
        if (currentPageBreadcrumb && !currentPageBreadcrumb.querySelector('a')) {
            currentPageBreadcrumb.textContent = breadcrumbText;
            currentPageBreadcrumb.className = 'current-page';
        }
        
        // Add click tracking
        breadcrumbs.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                trackEventEnhanced('breadcrumb_click', { target: link.href });
            });
        });
    };

    const init = async () => {
        currentLang = getInitialLang();

        // Load saved preferences
        applyTheme(localStorage.getItem(STORAGE.theme) === "on");
        try {
            activeVisitorFilter = localStorage.getItem(STORAGE.visitorFilter) || "all";
        } catch {
            activeVisitorFilter = "all";
        }
        
        applyLanguage("de", { persist: true });

        setupNavigation();
        setupInteractions();
        setupQuiz();
        setupMotion();
        setupSeoEnhancements();
        setupPwa();
        setupOfflineUI();
        setupMobileShortcuts();

        if (darkToggle) {
            darkToggle.addEventListener("click", () => {
                const isDark = !body.classList.contains("dark");
                applyTheme(isDark);
                try {
                    localStorage.setItem(STORAGE.theme, isDark ? "on" : "off");
                } catch {
                    // Storage not available
                }
            });
        }

        const content = await fetchContent("de");
        applyPlaceContent(content);
        ensureVisitorFilterUI(content);
        ensureFeedbackSection(content);
        ensureDetailEnhancements(content);

        updateVisitExperience();
        updateMapUI();
        updateCardResults();

        doc.querySelectorAll("[data-year]").forEach((el) => {
            el.textContent = String(new Date().getFullYear());
        });

        trackEvent("page_view", { title: doc.title });
    };

    init();
})();
