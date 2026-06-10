// lib/contentiq-app-copy.ts

export type Lang = "en" | "pl";

export function getLang(value?: string | null): Lang {
  return value === "pl" ? "pl" : "en";
}

export const appCopy = {
  en: {
    otherFlag: "🇵🇱",
    switchLabel: "Switch to Polish",
    langParam: "pl",

    common: {
      notConnected: "Not connected",
      noData: "No data",
      noDate: "No date",
      noSync: "Not synchronized",
      now: "now",
      minAgo: "min ago",
      hoursAgo: "hours ago",
      daysAgo: "days ago",
      manualLinks: "Manual links",
      missingData: "No data",
      draft: "Draft",
      approval: "For approval",
      scheduled: "Scheduled",
      published: "Published",
      analysis: "analysis",
      imported: "imported",
      manualLink: "manual link",
      createdInApp: "created in app",
      scheduledInApp: "scheduled in app",
      signOut: "Sign out",
      signingOut: "Signing out...",
      backToDashboard: "Back to dashboard",
      goToApp: "Go to application",
      save: "Save",
      cancel: "Cancel",
      edit: "Edit",
      delete: "Delete",
      loading: "Loading...",
      sync: "Sync",
      syncNow: "Sync now",
      connect: "Connect",
      connected: "Connected",
      settings: "Settings",
      privacy: "Privacy Policy",
      terms: "Terms of Service",
    },

    navGroups: {
      stats: "Analytics",
      creation: "Creation",
      inspirationLibrary: "Inspirations",
      templateLibrary: "Templates",
      ai: "AI",
      settings: "System",
    },

    nav: {
      accounts: "Account summary",
      content: "Content summary",
      compare: "Content comparison",
      studio: "Content Studio",
      blogStudio: "Blog Studio",
      blogLibrary: "Blog library",
      video: "Video Studio",
      shorts: "Short Studio",
      creative: "Creative Studio",
      calendar: "Publishing calendar",

      inspirationsContent: "Content inspirations",
      inspirationsVideo: "Video inspirations",
      inspirationsShort: "Short inspirations",
      inspirationsCreative: "Creative inspirations",

      templatesContent: "Content templates",
      templatesVideo: "Video templates",
      templatesShort: "Short templates",
      templatesCreative: "Creative templates",

      offers: "Offers and links",
      brand: "Brand Memory",
      partner: "AI Partner",
      strategist: "AI Strategist",
      chat: "AI Chat",

      integrations: "Integrations",
      settings: "Settings",
    },

    accountDefaults: {
      handle: "Not connected",
      score: 0,
      trend: 0,
      posts: 0,
      engRate: "0%",
      reach: "0",
      bestFormat: "No data",
      lastSync: "Not connected",
      aiTag:
        "Connect an account and synchronize it to see real data here.",
      connectedNoPosts:
        "The account is connected, but no posts have been saved yet. Run synchronization.",
      connectedManualLinks:
        "You have manual links as context, but the API has not saved any publications yet. Run synchronization and check the API message.",
      importedRecord:
        "Real record imported from API. AI analysis will appear after performance calculation.",
      manualLinkAi:
        "Manual link added. AI can use it as context, but metrics remain 0 until data is imported from API.",
      noConnectedAccounts:
        "No connected accounts yet. Connect platforms and synchronize them to see real cross-platform analysis.",
      connectedNoData:
        "Accounts are connected, but there are no imported publications in the database yet. After synchronization, analysis will be calculated from real data.",
    },

    insights: {
      strongest: "Strongest channel based on real data",
      aiScore: "AI score",
      publications: "publications",
      watch: "To watch",
      apiCheck:
        "If the score is low or zero, check API permissions and the quality of imported metrics.",
      totalInDatabase: "Total imported publications in the database",
    },

    templates: {
      templatesContent: {
        label: "Content templates",
        title: "Templates from Content Studio",
        description:
          "Text content, posts, carousels and variants prepared in Content Studio.",
      },
      templatesVideo: {
        label: "Video templates",
        title: "Templates from Video Studio",
        description:
          "Video briefs, scripts, shots, thumbnails and checklists saved from Video Studio.",
      },
      templatesShort: {
        label: "Short templates",
        title: "Templates from Short Studio",
        description:
          "Short-form formats and variants for TikTok, Reels, Shorts and LinkedIn Video.",
      },
      templatesCreative: {
        label: "Creative templates",
        title: "Templates from Creative Studio",
        description:
          "Prompts, formats and visual briefs prepared in Creative Studio.",
      },
    },

    inspirations: {
      inspirationsContent: {
        label: "Content inspirations",
        title: "Inspirations from Content Studio",
        description:
          "Ideas, post suggestions, hook variants and working drafts that you can edit and turn into templates.",
      },
      inspirationsVideo: {
        label: "Video inspirations",
        title: "Inspirations from Video Studio",
        description:
          "Script ideas, shots, thumbnails and video captions for further editing.",
      },
      inspirationsShort: {
        label: "Short inspirations",
        title: "Inspirations from Short Studio",
        description:
          "Ideas for short-form content, hooks, captions and variants for TikTok, Reels, Shorts and LinkedIn Video.",
      },
      inspirationsCreative: {
        label: "Creative inspirations",
        title: "Inspirations from Creative Studio",
        description:
          "Ideas for graphics, thumbnails, covers, prompts and social media creatives.",
      },
    },

    integrations: [
      {
        name: "Instagram / Facebook",
        status: "To connect",
        description:
          "Meta Graph API: posts, Reels, reach, comments and publishing.",
      },
      {
        name: "YouTube",
        status: "Priority",
        description:
          "Videos, Shorts, captions, thumbnails, retention and channel results.",
      },
      {
        name: "LinkedIn",
        status: "Planned",
        description:
          "Company pages, B2B posts, comments and publication statistics.",
      },
      {
        name: "TikTok",
        status: "Later",
        description:
          "Video, performance, publishing and format adjustment for the platform.",
      },
      {
        name: "Blog / WordPress",
        status: "Planned",
        description:
          "Articles, SEO score, blog to social and social to blog.",
      },
      {
        name: "Spotify",
        status: "Planned",
        description:
          "Podcasts, episodes, listening data, completion rate and descriptions.",
      },
      {
        name: "Google Analytics",
        status: "Planned",
        description:
          "Traffic, sources, conversions, blog and content campaigns.",
      },
    ],
  },

  pl: {
    otherFlag: "🇬🇧",
    switchLabel: "Switch to English",
    langParam: "en",

    common: {
      notConnected: "Niepodłączone",
      noData: "Brak danych",
      noDate: "Brak daty",
      noSync: "Nie zsynchronizowano",
      now: "teraz",
      minAgo: "min temu",
      hoursAgo: "godz. temu",
      daysAgo: "dni temu",
      manualLinks: "Linki ręczne",
      missingData: "Brak danych",
      draft: "Szkic",
      approval: "Do akceptacji",
      scheduled: "Zaplanowane",
      published: "Opublikowane",
      analysis: "analiza",
      imported: "import",
      manualLink: "link ręczny",
      createdInApp: "utworzone w aplikacji",
      scheduledInApp: "zaplanowane w aplikacji",
      signOut: "Wyloguj",
      signingOut: "Wylogowywanie...",
      backToDashboard: "Wróć do dashboardu",
      goToApp: "Przejdź do aplikacji",
      save: "Zapisz",
      cancel: "Anuluj",
      edit: "Edytuj",
      delete: "Usuń",
      loading: "Ładowanie...",
      sync: "Synchronizacja",
      syncNow: "Synchronizuj",
      connect: "Połącz",
      connected: "Połączone",
      settings: "Ustawienia",
      privacy: "Polityka prywatności",
      terms: "Regulamin",
    },

    navGroups: {
      stats: "Analiza",
      creation: "Tworzenie",
      inspirationLibrary: "Inspiracje",
      templateLibrary: "Szablony",
      ai: "AI",
      settings: "System",
    },

    nav: {
      accounts: "Podsumowanie kont",
      content: "Podsumowanie contentu",
      compare: "Porównanie contentu",
      studio: "Content Studio",
      blogStudio: "Blog Studio",
      blogLibrary: "Biblioteka bloga",
      video: "Video Studio",
      shorts: "Short Studio",
      creative: "Creative Studio",
      calendar: "Harmonogram",

      inspirationsContent: "Inspiracje contentu",
      inspirationsVideo: "Inspiracje video",
      inspirationsShort: "Inspiracje short",
      inspirationsCreative: "Inspiracje creative",

      templatesContent: "Szablony contentu",
      templatesVideo: "Szablony video",
      templatesShort: "Szablony short",
      templatesCreative: "Szablony creative",

      offers: "Oferta i linki",
      brand: "Pamięć marki",
      partner: "AI Partner",
      strategist: "AI Strateg",
      chat: "AI Chat",

      integrations: "Integracje",
      settings: "Ustawienia",
    },

    accountDefaults: {
      handle: "Niepodłączone",
      score: 0,
      trend: 0,
      posts: 0,
      engRate: "0%",
      reach: "0",
      bestFormat: "Brak danych",
      lastSync: "Niepodłączone",
      aiTag:
        "Połącz konto, a po synchronizacji pojawią się tutaj prawdziwe dane.",
      connectedNoPosts:
        "Konto jest podłączone, ale synchronizacja nie zapisała jeszcze żadnych postów. Uruchom pobieranie danych.",
      connectedManualLinks:
        "Masz ręczne linki jako kontekst, ale API nie zapisało jeszcze żadnej publikacji. Uruchom synchronizację i sprawdź komunikat API.",
      importedRecord:
        "Prawdziwy rekord pobrany z API. Analiza AI pojawi się po przeliczeniu wyników.",
      manualLinkAi:
        "Link dodany ręcznie. AI może użyć go jako kontekstu, ale metryki pozostają 0 do czasu pobrania danych z API.",
      noConnectedAccounts:
        "Nie ma jeszcze podłączonych kont. Po połączeniu platform i synchronizacji zobaczysz tutaj realną analizę cross-platform.",
      connectedNoData:
        "Konta są podłączone, ale w bazie nie ma jeszcze pobranych publikacji. Po uruchomieniu synchronizacji analiza zostanie policzona z realnych danych.",
    },

    insights: {
      strongest: "Najmocniejszy kanał z realnych danych",
      aiScore: "Wynik AI",
      publications: "publikacje",
      watch: "Do obserwacji",
      apiCheck:
        "Jeśli wynik jest niski albo zerowy, sprawdź zakresy API i jakość pobranych metryk.",
      totalInDatabase: "Łącznie pobranych publikacji w bazie",
    },

    templates: {
      templatesContent: {
        label: "Szablony contentu",
        title: "Szablony z Content Studio",
        description:
          "Treści tekstowe, posty, karuzele i warianty przygotowane w Content Studio.",
      },
      templatesVideo: {
        label: "Szablony video",
        title: "Szablony z Video Studio",
        description:
          "Briefy video, scenariusze, ujęcia, miniatury i checklisty zapisane z Video Studio.",
      },
      templatesShort: {
        label: "Szablony short",
        title: "Szablony z Short Studio",
        description:
          "Krótkie formaty i warianty pod TikTok, Reels, Shorts i LinkedIn Video.",
      },
      templatesCreative: {
        label: "Szablony creative",
        title: "Szablony z Creative Studio",
        description:
          "Prompty, formaty i briefy grafik przygotowane w Creative Studio.",
      },
    },

    inspirations: {
      inspirationsContent: {
        label: "Inspiracje contentu",
        title: "Inspiracje z Content Studio",
        description:
          "Pomysły, propozycje postów, warianty hooków i treści robocze, które możesz edytować i zamienić w szablon.",
      },
      inspirationsVideo: {
        label: "Inspiracje video",
        title: "Inspiracje z Video Studio",
        description:
          "Propozycje scenariuszy, ujęć, miniatur i opisów video do dalszej edycji.",
      },
      inspirationsShort: {
        label: "Inspiracje short",
        title: "Inspiracje z Short Studio",
        description:
          "Pomysły na krótkie formaty, hooki, opisy i warianty pod TikTok, Reels, Shorts oraz LinkedIn Video.",
      },
      inspirationsCreative: {
        label: "Inspiracje creative",
        title: "Inspiracje z Creative Studio",
        description:
          "Pomysły na grafiki, miniatury, okładki, prompty i kreacje do social media.",
      },
    },

    integrations: [
      {
        name: "Instagram / Facebook",
        status: "Do podłączenia",
        description:
          "Meta Graph API: posty, Reels, zasięgi, komentarze, publikacja.",
      },
      {
        name: "YouTube",
        status: "Priorytet",
        description:
          "Filmy, Shorts, opisy, miniatury, retencja i wyniki kanału.",
      },
      {
        name: "LinkedIn",
        status: "Planowane",
        description:
          "Strony firmowe, posty B2B, komentarze i statystyki publikacji.",
      },
      {
        name: "TikTok",
        status: "Później",
        description:
          "Video, wyniki, publikacja i dopasowanie formatu do platformy.",
      },
      {
        name: "Blog / WordPress",
        status: "Planowane",
        description:
          "Artykuły, SEO score, blog → social, social → blog.",
      },
      {
        name: "Spotify",
        status: "Planowane",
        description:
          "Podcasty, odcinki, słuchalność, completion rate i opisy.",
      },
      {
        name: "Google Analytics",
        status: "Planowane",
        description:
          "Ruch, źródła, konwersje, blog i kampanie contentowe.",
      },
    ],
  },
} as const;