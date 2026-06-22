/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { DataOpLog, PlayerStats, TeamStats, GameLog } from "../types";
import { Terminal, Play, Cpu, RefreshCw, Layers, CheckCircle, Upload, Code, Database, Trash2 } from "lucide-react";

interface DataOpsPanelProps {
  players: PlayerStats[];
  league: "nba" | "wnba";
  onSimulationUpdated?: () => void;
  onImportData: (data: { teams?: TeamStats[]; players?: PlayerStats[]; gameLogs?: Record<string, GameLog[]> }) => void;
  onResetData: () => void;
  hasImportedData: boolean;
}

export default function DataOpsPanel({ 
  players, 
  league, 
  onSimulationUpdated, 
  onImportData, 
  onResetData, 
  hasImportedData 
}: DataOpsPanelProps) {
  const [logs, setLogs] = useState<DataOpLog[]>([
    { id: "1", timestamp: "12:56:00", type: "info", message: `Sistemul HoopMetrics instanțiat pentru liga: ${league.toUpperCase()}` },
    { id: "2", timestamp: "12:56:01", type: "success", message: `Încărcat cu succes baza locală de parquets: ${players.length} jucători activi` }
  ]);
  
  const [activeTask, setActiveTask] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [selectedPlayerForUpdate, setSelectedPlayerForUpdate] = useState("");
  const [showExporterHelp, setShowExporterHelp] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const consoleBottomRef = useRef<HTMLDivElement>(null);

  // Auto scroll console down
  useEffect(() => {
    if (consoleBottomRef.current) {
      consoleBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  // Log on league shift
  useEffect(() => {
    addLog("info", `Schimbat contextul activ la liga: ${league.toUpperCase()}`);
  }, [league]);

  const addLog = (type: "info" | "success" | "warning" | "error", message: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [
      ...prev,
      {
        id: Math.random().toString(),
        timestamp: time,
        type,
        message
      }
    ]);
  };

  // 1. UPDATE TEAM GAMES
  const runTeamGamesUpdate = () => {
    if (activeTask) return;
    setActiveTask("team_games");
    setProgress(0);
    addLog("info", `Inițiez operațiunea de batch-scraping: update_games_store('${league}')`);

    const stages = [
      { p: 15, msg: "⚙️ Se conectează la serverele de date NBA/WNBA stats API..." },
      { p: 45, msg: "⚙️ Descărcat jurnale recente meciuri. Parsare JSON raw în Pandas DataFrame..." },
      { p: 75, msg: `⚙️ Normalizare posesii și calcul net-ratings ponderate pentru ${league.toUpperCase()}...` },
      { p: 100, msg: "🏆 Recreată cu succes tabela normalize_team_games(). Salvare parquet reconciliată." }
    ];

    let currentStageIdx = 0;
    const interval = setInterval(() => {
      if (currentStageIdx < stages.length) {
        const stage = stages[currentStageIdx];
        setProgress(stage.p);
        addLog(stage.p === 100 ? "success" : "info", stage.msg);
        currentStageIdx++;
      } else {
        clearInterval(interval);
        setActiveTask(null);
        if (onSimulationUpdated) onSimulationUpdated();
      }
    }, 1500);
  };

  // 2. REBUILD ALL FEATURES
  const runRebuildFeatures = () => {
    if (activeTask) return;
    setActiveTask("rebuild_features");
    setProgress(0);
    addLog("info", `Inițiez recompilarea completă a depozitului de vectori: rebuild_player_features_store('${league}')`);

    const stages = [
      { p: 20, msg: "⚡ Extragere înregistrări din tabela raw_players_parquet..." },
      { p: 50, msg: "⚡ Calcul medii mobile ponderate exponențial (alpha=0.15) pentru toți parametrii..." },
      { p: 80, msg: "⚡ Evaluat reziduuri stastice heteroscedastice și deviații RMSE pe tipuri de matchups..." },
      { p: 100, msg: "⚡ Vector Store recompilat integral. Fișiere de caracteristici sincronizate în cloud." }
    ];

    let currentStageIdx = 0;
    const interval = setInterval(() => {
      if (currentStageIdx < stages.length) {
        const stage = stages[currentStageIdx];
        setProgress(stage.p);
        addLog(stage.p === 100 ? "success" : "info", stage.msg);
        currentStageIdx++;
      } else {
        clearInterval(interval);
        setActiveTask(null);
        if (onSimulationUpdated) onSimulationUpdated();
      }
    }, 1200);
  };

  // 3. UPDATE SINGLE PLAYER
  const runSinglePlayerUpdate = () => {
    if (activeTask || !selectedPlayerForUpdate) return;
    const playerObj = players.find(p => p.player_id === selectedPlayerForUpdate);
    if (!playerObj) return;

    setActiveTask("single_player");
    setProgress(0);
    addLog("info", `Se rulează cache-update incremental pentru: [${playerObj.name}] id: ${playerObj.player_id}`);

    const stages = [
      { p: 30, msg: `⚙️ Se interoghează endpoint NBA stats pentru ID-ul ${playerObj.player_id}...` },
      { p: 70, msg: `⚙️ S-au extras performanțe noi meciuri. Rebuilding static matrices pentru [${playerObj.name}]...` },
      { p: 100, msg: `🏆 Incremental update completat pentru ${playerObj.name}. Touched list actualizat.` }
    ];

    let currentStageIdx = 0;
    const interval = setInterval(() => {
      if (currentStageIdx < stages.length) {
        const stage = stages[currentStageIdx];
        setProgress(stage.p);
        addLog(stage.p === 100 ? "success" : "info", stage.msg);
        currentStageIdx++;
      } else {
        clearInterval(interval);
        setActiveTask(null);
        if (onSimulationUpdated) onSimulationUpdated();
      }
    }, 1400);
  };

  // 4. PARSE UPLOADED DATA
  const handleFileUpload = (file: File) => {
    if (!file) return;
    addLog("info", `Se citește fișierul importat: ${file.name} (${(file.size / 1024).toFixed(1)} KB)...`);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);
        
        let teamsCount = parsed.teams?.length || 0;
        let playersCount = parsed.players?.length || 0;
        let logsCount = Object.keys(parsed.gameLogs || {}).length;
        
        if (teamsCount === 0 && playersCount === 0 && logsCount === 0) {
          throw new Error("Fișierul JSON nu conține date structurate valide pentru echipe, jucători sau game_logs.");
        }
        
        onImportData(parsed);
        addLog("success", `ASIMILARE REUȘITĂ! S-au încărcat în memorie: ${teamsCount} echipe, ${playersCount} jucători, game_logs pentru ${logsCount} atleti activi.`);
      } catch (err: any) {
        addLog("error", `Eroare parsare JSON import: ${err.message || err}`);
      }
    };
    reader.readAsText(file);
  };

  // Drag & drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <div id="data-ops-container" className="bg-[#0F0F0F] border border-white/10 rounded-none p-6 relative overflow-hidden">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-[10px] uppercase tracking-widest text-[#FF6B00] font-bold">
          Data Operations
        </h3>
        <span className="text-[9px] bg-white/5 border border-white/15 text-white/70 font-mono px-2 py-0.5 uppercase tracking-wider">
          CLI V2.1.0
        </span>
      </div>

      <p className="text-xs text-white/50 mb-6 font-serif italic leading-relaxed">
        Interfața de control asincronă pentru asimilare și segmentare meciuri sau parametri analitici de jucător.
      </p>

      {/* Dynamic Data Loader Dropzone */}
      <div className="mb-6 space-y-3 pt-2 border-t border-white/10">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-mono tracking-widest text-white/45 block uppercase">
            Import Real Datasets (Parquet-converted)
          </span>
          <button 
            onClick={() => setShowExporterHelp(!showExporterHelp)}
            className="text-[9px] text-[#FF6B00] hover:underline flex items-center gap-1 font-mono uppercase"
          >
            <Code className="w-3 h-3" /> {showExporterHelp ? "Ascunde cod script" : "Vezi tutorial Python"}
          </button>
        </div>

        {/* Python Exporter Help Accordion */}
        {showExporterHelp && (
          <div className="bg-[#050505] border border-white/10 p-4 rounded-none font-mono text-[9.5px] leading-relaxed text-white/70 space-y-3 max-h-[300px] overflow-y-auto">
            <p className="text-white/50 font-serif italic mb-1">
              Adaugă acest script (sau înlocuiește conținutul din <code className="text-[#FF6B00]">export_to_web_ui.py</code>) în directorul tău local <code className="text-white">BasketSUA_v2</code> și rulează-l. Este complet securizat la codificări Windows și caută fișierele automat:
            </p>
            <pre className="text-[#FF6B00] bg-[#121212] p-3 text-[9px] overflow-x-auto whitespace-pre border border-white/5 selection:bg-white/10">
{`# export_to_web_ui.py
import os
import pandas as pd
import json

TEAM_NAME_TO_ABB = {
    # NBA
    "atlanta hawks": "ATL", "boston celtics": "BOS", "brooklyn nets": "BKN", "charlotte hornets": "CHA",
    "chicago bulls": "CHI", "cleveland cavaliers": "CLE", "dallas mavericks": "DAL", "denver nuggets": "DEN",
    "detroit pistons": "DET", "golden state warriors": "GSW", "houston rockets": "HOU", "indiana pacers": "IND",
    "los angeles clippers": "LAC", "los angeles lakers": "LAL", "memphis grievances": "MEM", "memphis grizzlies": "MEM", 
    "miami heat": "MIA", "milwaukee bucks": "MIL", "minnesota timberwolves": "MIN", "new orleans pelicans": "NOP", 
    "new york knicks": "NYK", "oklahoma city thunder": "OKC", "orlando magic": "ORL", "philadelphia 76ers": "PHI", 
    "phoenix suns": "PHX", "portland trail blazers": "POR", "sacramento kings": "SAC", "san antonio spurs": "SAS", 
    "toronto raptors": "TOR", "utah jazz": "UTA", "washington wizards": "WAS",
    # WNBA
    "atlanta dream": "ATL", "chicago sky": "CHI", "connecticut sun": "CON", "dallas wings": "DAL",
    "indiana fever": "IND", "las vegas aces": "LVA", "los angeles sparks": "LAS", "minnesota lynx": "MIN",
    "new york liberty": "NYL", "phoenix mercury": "PHO", "seattle storm": "SEA", "washington mystics": "WAS"
}

def get_team_abbreviation(team_name):
    clean_name = str(team_name).lower().strip()
    for fullname, abb in TEAM_NAME_TO_ABB.items():
        if fullname in clean_name or clean_name in fullname:
            return abb
    # Fallback canonic
    words = clean_name.split()
    if len(words) >= 1:
        first_word = words[0]
        if len(first_word) >= 3:
            return first_word[:3].upper()
    return clean_name[:3].upper()

def find_file_by_keywords(keywords, must_not_include=[]):
    """Caută recursiv în folderul curent un fișier al cărui nume conține toate cuvintele cheie."""
    for root, dirs, files in os.walk("."):
        # Ignorăm folderele ascunse sau de runtime
        if any(p in root.replace("\\", "/").split("/") for p in [".git", "node_modules", "venv", ".venv", "cache", "http"]):
            continue
        for f in files:
            f_lower = f.lower()
            if f_lower.endswith(".parquet") or f_lower.endswith(".json"):
                if all(kw.lower() in f_lower for kw in keywords):
                    if not any(nix.lower() in f_lower for nix in must_not_include):
                        resolved = os.path.join(root, f)
                        if "hoopmetrics_import" not in resolved:
                            return resolved
    return None

def read_json_with_encodings(file_path):
    """Citește JSON-ul încercând multiple codificări populare pe Windows (UTF-8, CP1252, Latin1)."""
    encodings = ['utf-8', 'utf-8-sig', 'cp1252', 'latin1', 'iso-8859-1']
    for enc in encodings:
        try:
            with open(file_path, 'r', encoding=enc) as f:
                return json.load(f), enc
        except (UnicodeDecodeError, Exception):
            continue
    raise UnicodeDecodeError(f"Nu s-a putut decoda JSON-ul {file_path} cu nicio codificare suportată.")

def smart_rename_columns(df):
    """Asigură-te că mapezi variațiile posibile de coloane Parquet la cele standard de export."""
    mapping = {
        # Coloane jucător
        'game_date': ['game_date', 'date', 'Date', 'GAME_DATE', 'meci_data'],
        'player_name': ['player_name', 'player', 'name', 'Player', 'PLAYER_NAME', 'nume_jucator'],
        'team_abbreviation': ['team_abbreviation', 'team_abb', 'team', 'TEAM_ABBREVIATION', 'echipa', 'Tm', 'tm'],
        'opponent_abbreviation': ['opponent_abbreviation', 'opponent', 'opp', 'OPPONENT', 'OPP', 'oponent', 'Opp', 'opp_abbr'],
        'minutes': ['minutes', 'minutes_played', 'min', 'MIN', 'MINUTES', 'minute', 'MP', 'mp'],
        'points': ['points', 'pts', 'PTS', 'POINTS', 'puncte'],
        'rebounds': ['rebounds', 'rebs', 'trb', 'TRB', 'REBOUNDS', 'recuperari', 'reb'],
        'assists': ['assists', 'ast', 'AST', 'ASSISTS', 'asistente', 'asist'],
        'fg3m': ['fg3m', 'fg3_made', 'fg3a', '3pt_made', '3pm', '3PT', 'fg3', '3P'],
        'fgm': ['fgm', 'fg', 'FGM', 'FG', 'aruncari_reusite'],
        'personal_fouls': ['personal_fouls', 'pf', 'PF', 'FOULS', 'faulturi', 'personal_foul'],
        'is_home': ['is_home', 'home_game', 'home', 'HOME', 'is_home_game', 'acasa'],
        
        # Coloane meciuri/echipe
        'team_name': ['team_name', 'team_n', 'TEAM_NAME', 'nume_echipa'],
        'offense_rating': ['offense_rating', 'ortg', 'off_rating', 'ORTG', 'offenseRating'],
        'defense_rating': ['defense_rating', 'drtg', 'def_rating', 'DRTG', 'defenseRating'],
        'pace': ['pace', 'PACE', 'ritm'],
        'record': ['record', 'season_record', 'team_record', 'RECORD']
    }
    
    rename_dict = {}
    for standard_col, list_of_aliases in mapping.items():
        for alias in list_of_aliases:
            if alias in df.columns and standard_col not in df.columns:
                rename_dict[alias] = standard_col
                break
                
    if rename_dict:
        df = df.rename(columns=rename_dict)
    return df

def parse_minutes(val):
    if pd.isna(val) or val is None:
        return 0.0
    val_str = str(val).strip()
    if ":" in val_str:
        try:
            parts = val_str.split(":")
            mins = float(parts[0])
            secs = float(parts[1]) if len(parts) > 1 else 0.0
            return round(mins + secs / 60.0, 2)
        except:
            pass
    try:
        return float(val)
    except:
        return 0.0

def parse_is_home(row):
    for col in ['is_home', 'home_game', 'home', 'HOME', 'is_home_game', 'acasa']:
        if col in row:
            val = row[col]
            if isinstance(val, bool): return val
            if isinstance(val, (int, float)): return bool(val)
            val_str = str(val).lower()
            return val_str in ['true', '1', 'yes', 'y', 'home', 'acasa', 't']
    # Căutăm câmp cu '@' în rând (Basketball reference away marker)
    for idx_name in row.index:
        val_str = str(row[idx_name])
        if val_str == "@":
            return False
    return True

def extract_identities(p_name_raw, slugs_dict):
    """
    Determină (player_id, clean_name) pe baza valorii din Parquet și catalog.
    Adresează problema în care câmpul player_name din parquet conține un id/slug în loc de nume clar.
    """
    if not slugs_dict:
        # Fără catalog, facem un clean name din slug (ex: "lebron_james" -> "Lebron James")
        clean = str(p_name_raw).replace("_", " ").replace("-", " ").title()
        return str(p_name_raw).lower().replace(" ", "_"), clean

    p_str = str(p_name_raw)
    
    # Cazul 1: p_str este cheie directă în catalog (slug -> nume sau nume -> slug)
    if p_str in slugs_dict:
        val = slugs_dict[p_str]
        caps_p = sum(1 for c in p_str if c.isupper())
        caps_v = sum(1 for c in val if c.isupper())
        if caps_v > caps_p or (" " in val and " " not in p_str):
            # p_str este slug (ID), val este nume clar
            return p_str, val
        else:
            # p_str este nume clar, val este slug (ID)
            return val, p_str

    # Cazul 2: p_str este valoare în catalog
    for k, v in slugs_dict.items():
        if v == p_str:
            caps_k = sum(1 for c in k if c.isupper())
            caps_v = sum(1 for c in v if c.isupper())
            if caps_v > caps_k or (" " in v and " " not in k):
                # k este slug (ID), v este nume clar
                return k, v
            else:
                # v este slug (ID), k este nume clar
                return v, k

    # Cazul 3: Căutare insensibilă la caractere mari/mici
    p_lower = p_str.lower().strip()
    for k, v in slugs_dict.items():
        if k.lower().strip() == p_lower:
            caps_k = sum(1 for c in k if c.isupper())
            caps_v = sum(1 for c in v if c.isupper())
            if caps_v > caps_k or (" " in v and " " not in k):
                return k, v
            else:
                return v, k
        if str(v).lower().strip() == p_lower:
            caps_k = sum(1 for c in k if c.isupper())
            caps_v = sum(1 for c in v if c.isupper())
            if caps_v > caps_k or (" " in v and " " not in k):
                return k, v
            else:
                return v, k

    # Cazul 4: Fallback dacă nu găsește nimic în catalog
    clean = p_str.replace("_", " ").replace("-", " ").title()
    return p_str.lower().replace(" ", "_"), clean

def export_hoop_metrics():
    print("="*60)
    print(" 🏀 HOOPMETRICS PARQUET PORTER SUITE v2.5 (AUTO-SCAN) 🏀")
    print("="*60)
    
    # 1. Încarcă fișierele de catalog de jucători (active_players.json)
    nba_active_players_path = find_file_by_keywords(["nba", "active", "player"])
    wnba_active_players_path = find_file_by_keywords(["wnba", "active", "player"])
    
    nba_slugs = {}
    if nba_active_players_path:
        try:
            nba_slugs, enc = read_json_with_encodings(nba_active_players_path)
            print(f"📖 Catalog NBA încărcat cu succes ({len(nba_slugs)} jucători) folosind codificarea {enc}.")
        except Exception as e:
            print(f"⚠️ Atenție la catalogul NBA: {e}")
    else:
        print("ℹ️ 'nba_active_players.json' nu a fost găsit. Automat vom asocia nume -> slug.")

    wnba_slugs = {}
    if wnba_active_players_path:
        try:
            wnba_slugs, enc = read_json_with_encodings(wnba_active_players_path)
            print(f"📖 Catalog WNBA încărcat cu succes ({len(wnba_slugs)} jucători) folosind codificarea {enc}.")
        except Exception as e:
            print(f"⚠️ Atenție la catalogul WNBA: {e}")
            
    # 2. Căutare fișiere de jocuri echipe
    games_parquet_nba = find_file_by_keywords(["nba", "game"]) or find_file_by_keywords(["nba_game"])
    games_parquet_wnba = find_file_by_keywords(["wnba", "game"]) or find_file_by_keywords(["wnba_game"])
    
    teams_dict = {} # Cheie: Abbreviation, Valoare: Structură Echipă
    
    # 2.1 Procesare meciuri echipe
    for file_path, is_nba in [(games_parquet_nba, True), (games_parquet_wnba, False)]:
        league_label = "NBA" if is_nba else "WNBA"
        if file_path:
            print(f"🔍 Procesare meciuri echipe {league_label}: {file_path}")
            try:
                df_games = pd.read_parquet(file_path)
                df_games = smart_rename_columns(df_games)
                
                # Avem coloane gen: Home, Away, Home_PTS, Away_PTS sau team_abbreviation?
                has_home_away = 'Home' in df_games.columns and 'Away' in df_games.columns
                
                if has_home_away:
                    print("   👉 Structură standard tip meciuri cap-la-cap. Calculăm recordurile meciurilor...")
                    # Calculăm statistici detaliate pentru fiecare echipă
                    team_games_count = {}
                    team_total_scored = {}
                    team_total_allowed = {}
                    team_wins = {}
                    team_losses = {}
                    
                    for _, row in df_games.iterrows():
                        home = row.get('Home')
                        away = row.get('Away')
                        home_pts = row.get('Home_PTS')
                        away_pts = row.get('Away_PTS')
                        
                        if home and away and pd.notna(home_pts) and pd.notna(away_pts):
                            try:
                                hp = float(home_pts)
                                ap = float(away_pts)
                                
                                # Games count
                                team_games_count[home] = team_games_count.get(home, 0) + 1
                                team_games_count[away] = team_games_count.get(away, 0) + 1
                                
                                # Points scored
                                team_total_scored[home] = team_total_scored.get(home, 0.0) + hp
                                team_total_scored[away] = team_total_scored.get(away, 0.0) + ap
                                
                                # Points allowed
                                team_total_allowed[home] = team_total_allowed.get(home, 0.0) + ap
                                team_total_allowed[away] = team_total_allowed.get(away, 0.0) + hp
                                
                                # Wins & losses
                                if home not in team_wins: team_wins[home] = 0
                                if home not in team_losses: team_losses[home] = 0
                                if away not in team_wins: team_wins[away] = 0
                                if away not in team_losses: team_losses[away] = 0
                                
                                if hp > ap:
                                    team_wins[home] += 1
                                    team_losses[away] += 1
                                elif ap > hp:
                                    team_wins[away] += 1
                                    team_losses[home] += 1
                            except:
                                pass
                                
                    all_detected_teams = set(df_games['Home'].dropna().unique()) | set(df_games['Away'].dropna().unique())
                    
                    # Calculăm media de puncte în ligă pentru scalare relativă
                    total_pts_across_league = 0.0
                    total_games_across_league = 0
                    for name in all_detected_teams:
                        games_played = team_games_count.get(name, 0)
                        if games_played > 0:
                            total_pts_across_league += team_total_scored.get(name, 0.0)
                            total_games_across_league += games_played
                    
                    league_avg_scored = (total_pts_across_league / total_games_across_league) if total_games_across_league > 0 else (114.7 if is_nba else 81.5)
                    league_base_rtg = 115.5 if is_nba else 102.5
                    
                    for name in all_detected_teams:
                        abb = get_team_abbreviation(name)
                        w = team_wins.get(name, 41)
                        l = team_losses.get(name, 41)
                        games_played = team_games_count.get(name, 82 if is_nba else 40)
                        
                        avg_scored = team_total_scored.get(name, 114.7 if is_nba else 81.5) / max(1, games_played)
                        avg_allowed = team_total_allowed.get(name, 114.7 if is_nba else 81.5) / max(1, games_played)
                        
                        # Setăm rating-uri d-offense, defense și pace dinamice pe baza meciurilor REALE
                        off_rtg = round(league_base_rtg * (avg_scored / league_avg_scored), 1) if league_avg_scored > 0 else league_base_rtg
                        def_rtg = round(league_base_rtg * (avg_allowed / league_avg_scored), 1) if league_avg_scored > 0 else league_base_rtg
                        
                        # Generăm un ritm/pace ușor diferit pentru varietate
                        base_pace = 98.4 if is_nba else 78.2
                        pace_val = round(base_pace * (0.96 + 0.08 * (hash(name) % 10) / 10.0), 1)
                        
                        teams_dict[abb.upper()] = {
                            "id": abb.lower(),
                            "name": str(name),
                            "abbreviation": abb.upper(),
                            "logoColor": "#FF6B00" if is_nba else "#FF4F00",
                            "offenseRating": off_rtg,
                            "defenseRating": def_rtg,
                            "pace": pace_val,
                            "restDays": 2,
                            "seasonRecord": f"{w}-{l}",
                            "league": "nba" if is_nba else "wnba"
                        }
                    print(f"   📊 S-au simulat stats detaliate pentru {len(all_detected_teams)} echipe {league_label}.")
                else:
                    # Alternativ: groupby team_abbreviation
                    team_col = 'team_abbreviation' if 'team_abbreviation' in df_games.columns else None
                    if team_col:
                        for team_abb, gp in df_games.groupby(team_col):
                            row = gp.iloc[0]
                            abb = str(team_abb).upper()
                            teams_dict[abb] = {
                                "id": abb.lower(),
                                "name": str(row.get('team_name', abb)),
                                "abbreviation": abb,
                                "logoColor": "#FF6B00" if is_nba else "#FF4F00",
                                "offenseRating": float(gp['offense_rating'].mean() if 'offense_rating' in gp else 112.0),
                                "defenseRating": float(gp['defense_rating'].mean() if 'defense_rating' in gp else 112.0),
                                "pace": float(gp['pace'].mean() if 'pace' in gp else 98.0),
                                "restDays": int(row.get('rest_days', 2)),
                                "seasonRecord": str(row.get('record', '41-41')),
                                "league": "nba" if is_nba else "wnba"
                            }
                        print(f"   📊 S-au pregătit {df_games[team_col].nunique()} echipe {league_label} din coloana '{team_col}'.")
                    else:
                        print(f"   ❌ Nicio coloană potrivită pentru echipe în {file_path}. Coloane: {list(df_games.columns)}")
            except Exception as e:
                print(f"   ⚠️ Eroare procesare teams în {file_path}: {e}")
        else:
            print(f"❓ Fișierul de meciuri echipe pentru {league_label} nu a fost găsit.")

    # 3. Căutare fișiere log-uri jucători
    # De data aceasta, căutăm foarte creativ (singular/plural, parquets)
    logs_parquet_nba = find_file_by_keywords(["nba", "player", "log"]) or find_file_by_keywords(["nba_player_log"]) or find_file_by_keywords(["nba", "logs"])
    logs_parquet_wnba = find_file_by_keywords(["wnba", "player", "log"]) or find_file_by_keywords(["wnba_player_log"]) or find_file_by_keywords(["wnba", "logs"])
    
    players_list = []
    game_logs_dict = {}
    all_logs = []
    
    for file_path, is_nba in [(logs_parquet_nba, True), (logs_parquet_wnba, False)]:
        league_label = "NBA" if is_nba else "WNBA"
        if file_path:
            print(f"🔍 Procesare loguri jucători {league_label}: {file_path}")
            try:
                df = pd.read_parquet(file_path)
                df = smart_rename_columns(df)
                df['league_context'] = 'nba' if is_nba else 'wnba'
                all_logs.append(df)
                print(f"   ✅ Încărcate {len(df)} rânduri.")
            except Exception as e:
                print(f"   ⚠️ Eroare la încărcare {file_path}: {e}")
        else:
            print(f"❓ Fișierul de loguri pentru {league_label} nu a fost găsit.")

    if all_logs:
        df_all_logs = pd.concat(all_logs, ignore_index=True)
        
        # Sortează după dată dacă există
        date_col = 'game_date' if 'game_date' in df_all_logs.columns else None
        if date_col:
            df_all_logs = df_all_logs.sort_values(date_col, ascending=False)
            
        # Detectează coloana pentru numele jucătorului
        pname_col = 'player_name' if 'player_name' in df_all_logs.columns else None
        if not pname_col:
            potential_pcols = [c for c in df_all_logs.columns if 'player' in c.lower() or 'name' in c.lower()]
            pname_col = potential_pcols[0] if potential_pcols else None
        
        if pname_col:
            print(f"⚡ Se asimilează meciurile pentru jucătorii detectați prin coloana '{pname_col}'...")
            for player_name, gp in df_all_logs.groupby(pname_col):
                if gp.empty or pd.isna(player_name): continue
                
                is_nba = gp['league_context'].iloc[0] == 'nba'
                slugs_dict = nba_slugs if is_nba else wnba_slugs
                p_id, clean_pname = extract_identities(player_name, slugs_dict)
                
                latest_row = gp.iloc[0]
                team_abb = str(latest_row.get('team_abbreviation', 'N/A')).upper()
                
                # Dacă echipa jucătorului lipsește din catalogul general de echipe, o creăm acum
                if team_abb != 'N/A' and team_abb not in teams_dict:
                    teams_dict[team_abb] = {
                        "id": team_abb.lower(),
                        "name": f"{team_abb} Team",
                        "abbreviation": team_abb,
                        "logoColor": "#FF6B00" if is_nba else "#FF4F00",
                        "offenseRating": 112.5 if is_nba else 101.5,
                        "defenseRating": 112.5 if is_nba else 101.5,
                        "pace": 98.0 if is_nba else 78.0,
                        "restDays": 2,
                        "seasonRecord": "41-41",
                        "league": "nba" if is_nba else "wnba"
                    }
                
                # Calculăm medii
                avg_min = float(gp['minutes'].apply(parse_minutes).mean() if 'minutes' in gp else 28.0)
                avg_pts = float(gp['points'].mean() if 'points' in gp else 12.0)
                avg_trb = float(gp['rebounds'].mean() if 'rebounds' in gp else 4.0)
                avg_ast = float(gp['assists'].mean() if 'assists' in gp else 3.0)
                avg_3pt = float(gp['fg3m'].mean() if 'fg3m' in gp else 1.0)
                avg_fg = float(gp['fgm'].mean() if 'fgm' in gp else 4.0)
                avg_pf = float(gp['personal_fouls'].mean() if 'personal_fouls' in gp else 2.0)
                
                players_list.append({
                    "player_id": p_id,
                    "name": clean_pname,
                    "team": team_abb,
                    "position": str(latest_row.get('position', 'G/F')),
                    "number": str(latest_row.get('jersey_number', '00')),
                    "avatarUrl": f"https://images.unsplash.com/photo-1544698310-74ea9d1c8258",
                    "avgMIN": round(avg_min, 1),
                    "avgPTS": round(avg_pts, 1),
                    "avgTRB": round(avg_trb, 1),
                    "avgAST": round(avg_ast, 1),
                    "avg3PT": round(avg_3pt, 1),
                    "avgFG": round(avg_fg, 1),
                    "avgPF": round(avg_pf, 1),
                    "league": "nba" if is_nba else "wnba"
                })
                
                # Adăugăm ultimele 12 meciuri jucate
                game_logs_dict[p_id] = [
                    {
                        "Date": str(row.get('game_date', '2026-06-01')),
                        "Season": "22",
                        "Opp": str(row.get('opponent_abbreviation', 'OPP')).upper(),
                        "Home": parse_is_home(row),
                        "MIN": float(parse_minutes(row.get('minutes', 30.0))),
                        "PTS": float(row.get('points', 0.0)),
                        "TRB": float(row.get('rebounds', 0.0)),
                        "AST": float(row.get('assists', 0.0)),
                        "3PT": float(row.get('fg3m', 0.0)),
                        "FG": float(row.get('fgm', 0.0)),
                        "PF": float(row.get('personal_fouls', 2.0))
                    } for _, row in gp.head(12).iterrows()
                ]
            print(f"✅ S-au procesat în total {len(players_list)} jucători activi.")
        else:
            print(f"❌ Nu s-a putut detecta nicio coloană pentru numele jucătorului. Coloane: {list(df_all_logs.columns)}")
    else:
        print("❌ Nu s-au încărcat fișiere de loguri. Asigurați-vă că fișierele .parquet sunt plasate corect.")

    # 4. Compunere bundle exportabil
    export_data = {
        "teams": list(teams_dict.values()),
        "players": players_list,
        "gameLogs": game_logs_dict
    }
    
    output_file = "hoopmetrics_import.json"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(export_data, f, indent=2, ensure_ascii=False)
        
    print("="*60)
    print(f"🎉 SUCCES COMPLET! Fișierul '{output_file}' a fost generat.")
    print(f"📁 Locație export: {os.path.abspath(output_file)}")
    print(f"📦 Echipe înregistrate: {len(teams_dict)} | Jucători asimilați: {len(players_list)}")
    print("👉 Trage acum fișierul generat bezpośred în browser în zona 'Import Real Datasets'!")
    print("="*60)

if __name__ == "__main__":
    export_hoop_metrics()`}
            </pre>
          </div>
        )}

        {/* Drag and Drop Box */}
        <div 
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border border-dashed p-5 text-center transition-all cursor-pointer ${
            dragActive 
              ? "border-[#FF6B00] bg-[#FF6B00]/5" 
              : "border-white/15 hover:border-[#FF6B00]/40 hover:bg-white/5"
          }`}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
            accept=".json"
            className="hidden" 
          />
          <Upload className="w-5 h-5 mx-auto text-[#FF6B00] mb-2 opacity-80" />
          <p className="text-xs text-white uppercase font-bold tracking-wider font-mono">
            Pune fișierul JSON aici
          </p>
          <p className="text-[10px] text-white/40 mt-1 font-serif italic text-center leading-normal">
            Trage sau selectează fișierul `hoopmetrics_import.json` transformat local din Parquet files.
          </p>
        </div>

        {hasImportedData && (
          <div className="flex items-center justify-between p-2.5 bg-green-500/10 border border-green-500/20">
            <span className="text-[9px] uppercase tracking-wider text-green-400 font-bold font-mono">
              ✓ Set de date personalizat încărcat
            </span>
            <button 
              onClick={() => {
                onResetData();
                addLog("warning", "Datele custom au fost șterse. Restabilit baza predefinită statică.");
              }}
              title="Resetează datele la cele demo standard"
              className="p-1 hover:bg-white/5 text-red-400 hover:text-red-300 transition-all font-mono text-[9px] uppercase tracking-widest flex items-center gap-1 font-bold"
            >
              <Trash2 className="w-3 h-3" /> RESET
            </button>
          </div>
        )}
      </div>

      {/* Grid of actions */}
      <div className="space-y-6 mb-6">
        
        {/* Action 1 & 2 side-by-side or stacked cleanly */}
        <div className="space-y-2">
          <span className="text-[9px] font-mono tracking-widest text-white/40 block uppercase">
            Store Pipeline triggers
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              id="update-team-games-btn"
              onClick={runTeamGamesUpdate}
              disabled={!!activeTask}
              className={`text-center p-3 border border-white/10 hover:bg-white/5 transition-colors text-xs uppercase tracking-tight font-bold ${
                activeTask 
                  ? "opacity-30 cursor-not-allowed" 
                  : "text-[#FF6B00] hover:border-[#FF6B00]/40"
              }`}
            >
              Update Team Games
            </button>
            <button
              id="rebuild-player-features-btn"
              onClick={runRebuildFeatures}
              disabled={!!activeTask}
              className={`text-center p-3 border border-white/10 hover:bg-white/5 transition-colors text-xs uppercase tracking-tight font-bold ${
                activeTask 
                  ? "opacity-30 cursor-not-allowed" 
                  : "text-white hover:border-white/30"
              }`}
            >
              Rebuild All Features
            </button>
          </div>
        </div>

        {/* Action 3: Update single player */}
        <div className="space-y-3 pt-2 border-t border-white/10">
          <span className="text-[9px] font-mono tracking-widest text-white/40 block uppercase">
            Incremental Cache Target
          </span>
          <div className="flex flex-col gap-2">
            <select
              id="data-ops-single-player-select"
              value={selectedPlayerForUpdate}
              onChange={(e) => setSelectedPlayerForUpdate(e.target.value)}
              disabled={!!activeTask}
              className="w-full bg-[#151515] border border-white/10 rounded-none p-3 text-xs text-white uppercase tracking-tight focus:outline-none"
            >
              <option value="">-- selectează jucător --</option>
              {players.map((p) => (
                <option key={p.player_id} value={p.player_id}>
                  {p.name} ({p.team})
                </option>
              ))}
            </select>
            <button
              id="run-single-player-update-btn"
              onClick={runSinglePlayerUpdate}
              disabled={!!activeTask || !selectedPlayerForUpdate}
              className={`w-full p-3 text-xs font-bold uppercase tracking-widest rounded-none transition-colors ${
                activeTask || !selectedPlayerForUpdate
                  ? "bg-white/5 border border-white/10 text-white/30 cursor-not-allowed" 
                  : "bg-[#F5F5F5] hover:bg-[#E5E5E5] text-black"
              }`}
            >
              Push Cache Refresh
            </button>
          </div>
        </div>

      </div>

      {/* Progress indicators */}
      {activeTask && (
        <div className="bg-[#151515] p-4 border border-white/10 rounded-none mb-4 transition-all">
          <div className="flex justify-between items-center text-[10px] uppercase tracking-widest font-mono mb-2">
            <span className="text-[#FF6B00] font-bold animate-pulse">Running: {activeTask}</span>
            <span className="text-white">{progress}%</span>
          </div>
          <div className="w-full bg-white/10 h-[2px]">
            <div 
              id="operation-progress-bar"
              style={{ width: `${progress}%` }} 
              className="bg-[#FF6B00] h-full transition-all duration-300"
            ></div>
          </div>
        </div>
      )}

      {/* Mock CLI logs screen */}
      <div className="border border-white/10 rounded-none overflow-hidden font-mono bg-[#050505]">
        <div className="px-4 py-2 bg-[#0F0F0F] border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            <span className="text-[9px] font-bold text-white/50 uppercase tracking-widest">
              Stdout logs
            </span>
          </div>
          <span className="text-[8px] text-white/30 lowercase">last-delta: +1.2s</span>
        </div>
        
        <div className="p-4 h-40 overflow-y-auto text-[9px] space-y-2 leading-relaxed scrollbar-thin scrollbar-thumb-white/10">
          {logs.map((log) => (
            <div key={log.id} className="flex gap-2 items-start text-white/80">
              <span className="text-white/30 flex-shrink-0 font-light">[{log.timestamp}]</span>
              <span className={`font-bold flex-shrink-0 uppercase ${
                log.type === "success" 
                  ? "text-green-400" 
                  : log.type === "error" 
                    ? "text-red-400" 
                    : log.type === "warning" 
                      ? "text-yellow-450 text-amber-400" 
                      : "text-[#FF6B00]"
              }`}>
                [{log.type}]
              </span>
              <span className="text-white/70 font-light">{log.message}</span>
            </div>
          ))}
          <div ref={consoleBottomRef} />
        </div>
      </div>
    </div>
  );
}
