export type TutorialId = 'shortcuts' | 'first-document' | 'pen' | 'node';

export interface TutorialStep {
  title: string;
  description: string;
  targetSelector?: string;
  shortcut?: string;
}

export interface TutorialDefinition {
  id: TutorialId;
  title: string;
  description: string;
  steps: readonly TutorialStep[];
}

export interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  tutorialId?: TutorialId;
}

export const TUTORIALS: readonly TutorialDefinition[] = [
  {
    id: 'shortcuts',
    title: 'Podstawowe skróty klawiszowe',
    description: 'Poznaj najważniejsze skróty, które przyspieszą Twoją pracę w edytorze Vectoria.',
    steps: [
      {
        title: 'Narzędzia selekcji i kształtów',
        description: 'Użyj V aby aktywować narzędzie Zaznaczania (Select), lub R aby szybko wybrać narzędzie Prostokąta.',
        targetSelector: "[data-tool='select']",
        shortcut: 'V / R',
      },
      {
        title: 'Cofanie i ponawianie zmian',
        description: 'Cmd+Z (Ctrl+Z) cofa ostatnią operację. Cmd+Shift+Z ponawia cofniętą czynność.',
        targetSelector: "[data-testid='undo-button']",
        shortcut: 'Cmd+Z / Cmd+Shift+Z',
      },
      {
        title: 'Przesuwanie i powiększanie widoku',
        description: 'Przytrzymaj Spację i przeciągaj myszą/palcem, aby przesuwać płótno (Pan). Użyj kółka myszy lub gestu uszczypnięcia (pinch), aby przybliżać widok.',
        targetSelector: "[data-testid='canvas-viewport']",
        shortcut: 'Space + Drag',
      },
      {
        title: 'Precyzyjne przesuwanie obiektów (Nudge)',
        description: 'Zaznacz obiekt i użyj klawiszy strzałek, aby przesuwać go o 1px. Przytrzymaj Shift, aby przesuwać o 10px.',
        targetSelector: "[data-testid='canvas-viewport']",
        shortcut: 'Arrow Keys / Shift+Arrows',
      },
    ],
  },
  {
    id: 'first-document',
    title: 'Pierwszy dokument i kształty',
    description: 'Krok po kroku stwórz swój pierwszy wektorowy projekt.',
    steps: [
      {
        title: 'Wybierz narzędzie Prostokąt',
        description: 'Kliknij ikonę Prostokąta na pasku narzędzi po lewej stronie lub naciśnij klawisz R.',
        targetSelector: "[data-tool='rectangle']",
        shortcut: 'R',
      },
      {
        title: 'Narysuj kształt na płótnie',
        description: 'Kliknij i przeciągnij na płótnie roboczym, aby stworzyć prostokąt o pożądanym rozmiarze.',
        targetSelector: "[data-testid='canvas-viewport']",
      },
      {
        title: 'Dostosuj wypełnienie i obrys',
        description: 'W prawym panelu właściwości (Properties) możesz zmienić kolor wypełnienia (Fill), kolor i grubość obrysu (Stroke) oraz krycie.',
        targetSelector: "[data-testid='right-dock']",
      },
      {
        title: 'Zaznaczanie wszystkiego',
        description: 'Naciśnij Cmd+A (Ctrl+A), aby natychmiast zaznaczyć wszystkie odblokowane obiekty na aktywnej warstwie.',
        shortcut: 'Cmd+A',
      },
    ],
  },
  {
    id: 'pen',
    title: 'Rysowanie ścieżek narzędziem Pióro',
    description: 'Naucz się tworzyć dowolne ścieżki i krzywe Béziera.',
    steps: [
      {
        title: 'Aktywuj Pióro (Pen)',
        description: 'Naciśnij klawisz P lub kliknij ikonę Pióra na pasku narzędzi.',
        targetSelector: "[data-tool='pen']",
        shortcut: 'P',
      },
      {
        title: 'Dodawanie punktów prostych',
        description: 'Pojedyncze kliknięcia dodają ostre węzły narożne (corner nodes).',
        targetSelector: "[data-testid='canvas-viewport']",
      },
      {
        title: 'Tworzenie gładkich łuków',
        description: 'Kliknij i przeciągnij kursor, aby wyciągnąć uchwyty kierunkowe Béziera i nadać ścieżce pożądaną krzywiznę.',
        targetSelector: "[data-testid='canvas-viewport']",
      },
      {
        title: 'Zamykanie lub zatwierdzanie ścieżki',
        description: 'Kliknij w pierwszy punkt ścieżki, aby ją zamknąć, lub naciśnij Enter, aby zatwierdzić otwartą ścieżkę. Klawisz Escape anuluje rysowanie.',
        shortcut: 'Enter / Escape',
      },
    ],
  },
  {
    id: 'node',
    title: 'Edycja węzłów i uchwytów (Node Tool)',
    description: 'Modyfikuj istniejące wektory z dokładnością do pojedynczego punktu kontrolnego.',
    steps: [
      {
        title: 'Wybierz narzędzie Węzłów',
        description: 'Naciśnij klawisz A lub wybierz narzędzie Edycji Węzłów (Node Tool).',
        targetSelector: "[data-tool='node']",
        shortcut: 'A',
      },
      {
        title: 'Zaznaczanie punktów kontrolnych',
        description: 'Kliknij węzeł na ścieżce, aby go zaznaczyć. Zaznaczony węzeł odsłania swoje uchwyty kierunkowe.',
        targetSelector: "[data-testid='canvas-viewport']",
      },
      {
        title: 'Przesuwanie i przekształcanie węzłów',
        description: 'Przeciągaj węzły myszą lub używaj klawiszy strzałek (Nudge) do precyzyjnego pozycjonowania.',
        shortcut: 'Arrow Keys',
      },
      {
        title: 'Typy węzłów',
        description: 'Możesz zmieniać charakter węzła między ostrym (corner), gładkim (smooth) a symetrycznym.',
      },
    ],
  },
];

export const ONBOARDING_CHECKLIST: readonly ChecklistItem[] = [
  {
    id: 'draw-shape',
    label: 'Narysuj pierwszy kształt',
    description: 'Wybierz prostokąt (R) lub elipsę (O) i narysuj kształt na płótnie.',
    tutorialId: 'first-document',
  },
  {
    id: 'change-color',
    label: 'Zmień kolor obiektu',
    description: 'Zaznacz obiekt i wybierz kolor wypełnienia w panelu właściwości.',
    tutorialId: 'first-document',
  },
  {
    id: 'nudge-arrow',
    label: 'Przesuń obiekt strzałkami (Nudge)',
    description: 'Zaznacz obiekt i użyj strzałek na klawiaturze (lub Shift+strzałka).',
    tutorialId: 'shortcuts',
  },
  {
    id: 'try-pen',
    label: 'Wypróbuj narzędzie Pióro (P)',
    description: 'Stwórz krzywą wektorową z węzłami Béziera.',
    tutorialId: 'pen',
  },
  {
    id: 'zoom-pan',
    label: 'Przetestuj powiększanie i przesuwanie',
    description: 'Użyj Spacji do przesuwania lub gestu uszczypnięcia (pinch-to-zoom).',
    tutorialId: 'shortcuts',
  },
];
