import React from "react";
import {
  Sparkles,
  Zap,
  Shield,
  Coins,
  Compass,
  Gift,
  Flame,
  Swords,
  HeartPulse,
  Crown,
} from "lucide-react";

interface QuickStartersProps {
  onSelect: (prompt: string, pluginName: string) => void;
  disabled: boolean;
}

export const QuickStarters: React.FC<QuickStartersProps> = ({ onSelect, disabled }) => {
  const starters = [
    {
      title: "Młot Boga Piorunów",
      name: "ThorHammer",
      description: "Magiczna broń rzucająca piorunami z odpychaniem i komendą /thor",
      prompt: "Stwórz plugin dodający Młot Boga Piorunów (Thor Hammer). Gdy gracz uderzy moba lub gracza tą bronią, pojawia się piorun (strikeLightning), odpycha okolicznych wrogów i tworzy cząsteczki eksplozji. Dodaj komendę /thorsword do otrzymania broni, uprawnienie thor.admin, cooldown 2 sekundy oraz config.yml z wiadomościami i obrażeniami.",
      icon: Zap,
      badge: "Walka & Magia",
      color: "from-amber-500/20 to-yellow-500/10 border-amber-500/30 text-amber-300",
    },
    {
      title: "RTP - Losowy Teleport",
      name: "SimpleRTP",
      description: "Bezpieczny teleport w losowe koordynaty z odliczaniem i particle",
      prompt: "Stwórz plugin na losowy teleport (/rtp). Szuka bezpiecznego bloku (nie woda, nie lawa, nie pustka) w promieniu od -2000 do 2000 bloków. Dodaj odliczanie 3 sekund, anulowanie teleportu przy poruszeniu gracza, efekty dźwiękowe i cząsteczki portalu oraz uprawnienie rtp.use i cooldown 30s.",
      icon: Compass,
      badge: "Narzędzia",
      color: "from-cyan-500/20 to-blue-500/10 border-cyan-500/30 text-cyan-300",
    },
    {
      title: "System Ekonomii & /pay",
      name: "CraftEconomy",
      description: "Wirtualny portfel, komendy /stan, /pay, /dodajkase i zapis do pliku",
      prompt: "Stwórz kompletny plugin ekonomii z walutą PLN/Monety. Komendy: /kasa lub /bal (pokazuje stan konta), /pay <gracz> <kwota> (przelew między graczami), /eco give/take/set <gracz> <kwota> (dla administratora). Trwały zapis stanu kont do pliku YAML/JSON, formatowanie liczb oraz konfigurowalne wiadomości.",
      icon: Coins,
      badge: "Ekonomia",
      color: "from-emerald-500/20 to-green-500/10 border-emerald-500/30 text-emerald-300",
    },
    {
      title: "GUI Menu z Dropami & Nagrodami",
      name: "DailyRewards",
      description: "Interaktywne menu ekwipunku /nagroda z odbieraniem codziennych prezentów",
      prompt: "Stwórz plugin z graficznym interfejsem GUI (/nagrody lub /daily). Otwiera skrzynkę GUI 27 slotów z animowanymi itemami (diamenty, szmaragdy, klucze). Gracz może odebrać nagrodę raz na 24h. Sprawdzanie kliknięcia w InventoryClickEvent, blokowanie wyciągania przedmiotów, dźwięki sukcesu i zapis czasu w configu.",
      icon: Gift,
      badge: "Interfejs GUI",
      color: "from-purple-500/20 to-pink-500/10 border-purple-500/30 text-purple-300",
    },
    {
      title: "Niezbędnik Administratora (Essentials)",
      name: "CoreAdmin",
      description: "Komendy /heal, /feed, /fly, /god, /gm 0/1, /speed i /clear",
      prompt: "Stwórz plugin administracyjny z zestawem kluczowych komend: /heal [gracz], /feed [gracz], /fly [gracz], /god [gracz] (nieśmiertelność), /gm 0/1/2/3, /speed <1-10>, /clearchat. Każda komenda z dedykowanym uprawnieniem 'core.<komenda>', obsługą konsoli, dźwiękami i ładnymi kolorowymi komunikatami z prefixem serwera.",
      icon: Shield,
      badge: "Administracja",
      color: "from-rose-500/20 to-red-500/10 border-rose-500/30 text-rose-300",
    },
    {
      title: "System Gildii & Stref Ochronnych",
      name: "MiniGuilds",
      description: "Tworzenie drużyny, strefa 25x25 chroniona przed niszczeniem i /gildia dom",
      prompt: "Stwórz lekki plugin na gildie (/gildia). Funkcje: /gildia stworz <tag> <nazwa>, /gildia usun, /gildia zapros <gracz>, /gildia dom, /gildia info. Każda gildia posiada teren 25x25 bloków, w którym tylko członkowie mogą stawiać i niszczyć bloki (BlockBreakEvent/BlockPlaceEvent). Zapis danych do configu.",
      icon: Crown,
      badge: "Gildie / PvP",
      color: "from-indigo-500/20 to-violet-500/10 border-indigo-500/30 text-indigo-300",
    },
  ];

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-emerald-400" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
          Gotowe Szablony Pluginów (Kliknij, aby wygenerować):
        </h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {starters.map((item, idx) => {
          const Icon = item.icon;
          return (
            <button
              key={idx}
              onClick={() => onSelect(item.prompt, item.name)}
              disabled={disabled}
              className={`p-3 rounded-lg border text-left bg-gradient-to-br transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed group flex flex-col justify-between gap-2 ${item.color}`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <Icon className="w-4 h-4" />
                    <span className="font-semibold text-xs text-white group-hover:text-emerald-300 transition-colors">
                      {item.title}
                    </span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/40 border border-white/10 font-mono">
                    {item.badge}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300/80 leading-snug line-clamp-2">
                  {item.description}
                </p>
              </div>
              <div className="text-[10px] text-emerald-400 font-mono flex items-center gap-1 mt-1">
                <span>Wygeneruj »</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
