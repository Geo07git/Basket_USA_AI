/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { ACTIVE_PLAYERS, NBA_TEAMS, WNBA_TEAMS, HISTORICAL_GAME_LOGS } from "./data";
import { League, PlayerStats, TeamStats, GameLog } from "./types";
import TeamPredictor from "./components/TeamPredictor";
import PlayerPredictor from "./components/PlayerPredictor";
import DataOpsPanel from "./components/DataOpsPanel";
import { Calendar, Activity } from "lucide-react";

export default function App() {
  const [league, setLeague] = useState<League>("nba");

  // State keys for localStorage
  const LOCAL_STORAGE_IMPORTED_DATA_KEY = "hoopmetrics_imported_data";

  // State representing custom imported data
  const [importedData, setImportedData] = useState<{
    teams?: TeamStats[];
    players?: PlayerStats[];
    gameLogs?: Record<string, GameLog[]>;
  } | null>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_IMPORTED_DATA_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // Calculate lists based on imported vs static fallback data
  const teams = useMemo(() => {
    if (importedData?.teams && importedData.teams.length > 0) {
      // Prioritize explicit league attribute if present
      const hasLeagueAttribute = importedData.teams.some(t => t.league);
      if (hasLeagueAttribute) {
        return importedData.teams.filter(t => t.league === league);
      }

      // Fallback to abbreviation-based filtering
      const importedForLeague = importedData.teams.filter(t => {
        const isWNBAAbbreviation = ["nyl", "lva", "sea", "ind", "con", "min"].includes(t.abbreviation.toLowerCase());
        const isNBAAbbreviation = ["bos", "den", "lal", "gsw", "mil", "phx", "mia", "dal"].includes(t.abbreviation.toLowerCase());
        if (league === "nba") {
          return !isWNBAAbbreviation; // default is nba unless explicit
        } else {
          return isWNBAAbbreviation || !isNBAAbbreviation;
        }
      });
      if (importedForLeague.length > 0) return importedForLeague;
    }
    return league === "nba" ? NBA_TEAMS : WNBA_TEAMS;
  }, [league, importedData]);

  const players = useMemo(() => {
    if (importedData?.players && importedData.players.length > 0) {
      // Prioritize explicit league attribute if present
      const hasLeagueAttribute = importedData.players.some(p => p.league);
      if (hasLeagueAttribute) {
        return importedData.players.filter(p => p.league === league);
      }

      const activeTeamAbbreviations = teams.map(t => t.abbreviation.toUpperCase());
      const filtered = importedData.players.filter(p => activeTeamAbbreviations.includes(p.team.toUpperCase()));
      if (filtered.length > 0) return filtered;
    }
    return ACTIVE_PLAYERS[league];
  }, [league, teams, importedData]);

  const gameLogs = useMemo(() => {
    const merged = { ...HISTORICAL_GAME_LOGS };
    if (importedData?.gameLogs) {
      Object.assign(merged, importedData.gameLogs);
    }
    return merged;
  }, [importedData]);

  const handleImportData = (data: any) => {
    setImportedData(data);
    localStorage.setItem(LOCAL_STORAGE_IMPORTED_DATA_KEY, JSON.stringify(data));
  };

  const handleResetData = () => {
    setImportedData(null);
    localStorage.removeItem(LOCAL_STORAGE_IMPORTED_DATA_KEY);
  };

  const seasons = league === "nba" ? ["2025-2026"] : ["2026"];

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F5F5F5] flex flex-col font-sans transition-colors duration-300">
      
      {/* Upper editorial header */}
      <header className="border-b border-white/10 bg-[#0A0A0A]/95 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-6 sm:px-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          
          <div className="space-y-1">
            <h1 id="app-title" className="text-4xl md:text-5xl font-black uppercase tracking-tighter leading-none italic text-white" style={{ fontFamily: "Georgia, serif" }}>
              Predicții V2
            </h1>
            <p className="text-[10px] tracking-[0.25em] uppercase text-white/50 font-mono">
              Incremental Data Engine • {league.toUpperCase()} Analysis
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-6 sm:gap-10 w-full md:w-auto justify-between md:justify-end">
            {/* Quick league select switcher */}
            <div className="flex flex-col items-start gap-1">
              <label className="text-[9px] uppercase tracking-widest opacity-45 font-mono">League Selector</label>
              <div className="bg-[#121212] p-1 rounded-sm border border-white/10 flex">
                <button
                  id="league-select-nba"
                  onClick={() => setLeague("nba")}
                  className={`px-3 py-1.5 rounded-sm text-xs font-bold font-mono transition-all uppercase tracking-wider ${
                    league === "nba"
                      ? "bg-[#FF6B00] text-white"
                      : "text-white/50 hover:text-white"
                  }`}
                >
                  NBA Pro
                </button>
                <button
                  id="league-select-wnba"
                  onClick={() => setLeague("wnba")}
                  className={`px-3 py-1.5 rounded-sm text-xs font-bold font-mono transition-all uppercase tracking-wider ${
                    league === "wnba"
                      ? "bg-[#FF6B00] text-white"
                      : "text-white/50 hover:text-white"
                  }`}
                >
                  WNBA Pro
                </button>
              </div>
            </div>

            <div className="flex gap-8">
              <div className="text-right">
                <p className="text-[9px] uppercase tracking-widest opacity-40 font-mono">Current Season</p>
                <p className="text-base font-mono font-bold text-white">{league === "nba" ? "2025-26" : "2026"}</p>
              </div>
              <div className="text-right border-l border-white/15 pl-6">
                <p className="text-[9px] uppercase tracking-widest opacity-40 font-mono">Active Target</p>
                <p className="text-base font-mono font-bold text-[#FF6B00]">{league.toUpperCase()}</p>
              </div>
            </div>
          </div>

        </div>
      </header>

      {/* Main Container, Desktop Fluidity restricted */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 sm:px-8 space-y-8">
        
        {/* Analyzed Season Metadata Bar */}
        <div className="bg-[#0F0F0F] border border-white/10 rounded-sm p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Calendar className="w-4 h-4 text-[#FF6B00] flex-shrink-0" />
            <div className="text-xs">
              <span className="opacity-50 uppercase tracking-wider font-mono">Sezoane active analizate local: </span>
              <strong className="text-white font-mono bg-white/5 px-2.5 py-1 rounded-sm border border-white/10">
                {seasons.join(", ")}
              </strong>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-[#FF6B00] font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
            Sistem antrenat offline • Parquet files
          </div>
        </div>

        {/* Dashboard layout splits */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* CLI Data Ops Panel in Left Section */}
          <div className="lg:col-span-4 space-y-8">
            <DataOpsPanel 
              players={players} 
              league={league} 
              onImportData={handleImportData}
              onResetData={handleResetData}
              hasImportedData={!!importedData}
            />
          </div>

          {/* Predictions Suite in Right Section */}
          <div className="lg:col-span-8 space-y-8">
            <TeamPredictor teams={teams} />
            <PlayerPredictor 
              players={players} 
              opponents={teams} 
              gameLogs={gameLogs} 
            />
          </div>

        </div>

      </main>

      {/* Senior aesthetic footer */}
      <footer className="border-t border-white/10 bg-[#090909] py-8 mt-16 text-center text-[10px] tracking-widest uppercase opacity-40 font-mono">
        <div className="max-w-7xl mx-auto px-6">
          <p>© 2026 HoopMetrics Intelligence V2. Distributed Parquet Storage • XGBoost Regressor v2.1.0.</p>
          <p className="mt-1 opacity-60">
            Utilizează Link-uri Logistic-Regression și Distribuții Gauss pentru margini de eroare.
          </p>
        </div>
      </footer>

    </div>
  );
}
