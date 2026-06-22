/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { PlayerStats, TeamStats, GameLog } from "../types";
import { getPlayerProjection } from "../data";
import { User, Calendar, ShieldAlert, Sparkles, TrendingUp, HelpCircle } from "lucide-react";

interface PlayerPredictorProps {
  players: PlayerStats[];
  opponents: TeamStats[];
  gameLogs: Record<string, GameLog[]>;
}

export default function PlayerPredictor({ players, opponents, gameLogs }: PlayerPredictorProps) {
  const [selectedPlayerId, setSelectedPlayerId] = useState(players[0]?.player_id || "");
  const [opponent, setOpponent] = useState("Toți");
  const [selectedMetric, setSelectedMetric] = useState<"PTS" | "TRB" | "AST" | "MIN">("PTS");

  // Sync state if players list updates (e.g. when changing leagues or importing custom datasets)
  React.useEffect(() => {
    if (players && players.length > 0) {
      setSelectedPlayerId(players[0]?.player_id || "");
      setOpponent("Toți");
    }
  }, [players]);

  const player = players.find(p => p.player_id === selectedPlayerId) || players[0];

  if (!player) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center text-slate-400">
        Nu există jucători înregistrați pentru această ligă.
      </div>
    );
  }

  const logs = gameLogs[player.player_id] || [];

  // Fetch projection details
  const { predictions, rmse, ciLow, ciHigh, modelInfo, opponentMeta } = getPlayerProjection(logs, player, opponent);

  // Generate list of possible opponents from the selected player's league
  const opponentsList = opponents.map(o => o.abbreviation).filter(opp => opp !== player.team);

  // Render SVG Sparkline trend of the last matches for selected metric
  const sparklineData = logs.map(l => l[selectedMetric] as number);
  const maxMetricVal = Math.max(...sparklineData, 10);
  const minMetricVal = Math.min(...sparklineData, 0);
  const range = maxMetricVal - minMetricVal || 1;

  return (
    <div id="player-predictor-card" className="bg-[#0F0F0F] border border-white/10 rounded-none p-6 relative">
      
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xs uppercase tracking-[0.4em] border-l-4 border-[#FF6B00] pl-3 font-bold">
          Player Performance
        </h2>
        <span className="text-[9px] font-mono text-white/40 tracking-wider bg-white/5 px-2.5 py-1">
          HETEROSCEDASTIC REGRESSION
        </span>
      </div>

      {/* Select Player Profile */}
      <div className="bg-[#121212] p-4 border border-white/10 rounded-none mb-6 flex flex-col sm:flex-row gap-5 items-center">
        <div className="relative w-16 h-16 rounded-full overflow-hidden border border-white/10 bg-[#151515] flex-shrink-0">
          <img 
            src={player.avatarUrl} 
            alt={player.name}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover grayscale brightness-90 hover:grayscale-0 transition-all duration-300"
          />
          <div className="absolute bottom-0 right-0 bg-[#FF6B00] text-white text-[9px] font-bold px-1.5 font-mono">
            #{player.number}
          </div>
        </div>

        <div className="flex-1 w-full space-y-1.5">
          <label className="text-[9px] font-mono tracking-widest text-[#FF6B00] block uppercase font-bold">
            Target Active Athlete
          </label>
          <select
            id="player-select"
            value={selectedPlayerId}
            onChange={(e) => {
              setSelectedPlayerId(e.target.value);
              setOpponent("Toți"); // reset opponent filters on swap
            }}
            className="w-full bg-[#151515] border border-white/10 rounded-none px-4 py-2.5 text-white text-xs font-mono uppercase tracking-tight focus:outline-none focus:border-[#FF6B00] transition-colors"
          >
            {players.map((p) => (
              <option key={p.player_id} value={p.player_id}>
                {p.name} ({p.team} - {p.position})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Adversary Adjustments */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5 bg-[#121212] p-4 border border-white/10 rounded-none">
          <label className="text-[10px] font-mono tracking-wider font-semibold text-white/50 uppercase block">
            🎯 Defensive Matchup Adjustment
          </label>
          <select
            id="opponent-select"
            value={opponent}
            onChange={(e) => setOpponent(e.target.value)}
            className="w-full bg-[#151515] border border-white/10 rounded-none px-3 py-2 text-white text-xs font-mono focus:outline-none focus:border-[#FF6B00] transition-colors"
          >
            <option value="Toți">Toate echipele (Medie sezon)</option>
            {opponentsList.map((opp) => (
              <option key={opp} value={opp}>
                Adversar specific: {opp}
              </option>
            ))}
          </select>
          <span className="text-[9px] text-white/40 block font-mono italic">
            *Ajustează coeficienții pe baza defensivei istorice a oponentului.
          </span>
        </div>

        <div className="bg-[#121212] p-4 border border-white/10 rounded-none flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[9px] font-mono tracking-widest text-white/40 uppercase">Ajustare Defensivă</span>
            <span className={`text-[9px] px-1.5 py-0.2 font-mono font-bold ${
              opponentMeta.adjustmentFactor.startsWith("-") 
                ? "bg-red-500/10 text-red-400" 
                : opponentMeta.adjustmentFactor === "0.0%" 
                  ? "bg-white/5 text-white/50" 
                  : "bg-green-500/10 text-green-400"
            }`}>
              {opponentMeta.adjustmentFactor}
            </span>
          </div>
          <div className="text-xs font-bold text-white uppercase tracking-wider">
            {opponentMeta.defenseGrade}
          </div>
          <div className="text-[10px] text-white/50 leading-tight mt-1 font-serif italic">
            {opponentMeta.reason}
          </div>
        </div>
      </div>

      {/* Stats Prediction Display Grid - High-Fidelity UI cards with relative confidence bounds */}
      <div className="mb-6">
        <h3 className="text-[10px] font-mono font-bold text-white/55 uppercase tracking-[0.3em] mb-4">
          📈 Proiecții Statistice & Interval de Încredere (90% CI)
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3.5">
          {(["PTS", "TRB", "AST", "MIN", "3PT", "FG", "PF"] as const).map((key) => {
            const labelMap: Record<string, string> = {
              PTS: "Puncte",
              TRB: "Recup",
              AST: "Asist",
              MIN: "Minute",
              "3PT": "3Pt Reuș",
              FG: "Aruncări",
              PF: "Faulturi"
            };

            const isKeyStat = ["PTS", "TRB", "AST"].includes(key);

            const proj = predictions[key] || 0;
            const low = ciLow[key] || 0;
            const high = ciHigh[key] || 0;
            
            // Percentage of slider relative to total width
            const totalScale = (high + 1) || 1;
            const lowPercent = Math.min(90, Math.max(0, (low / totalScale) * 100));
            const projPercent = Math.min(95, Math.max(5, (proj / totalScale) * 100));

            return (
              <div 
                key={key} 
                className={`bg-[#121212] p-4.5 border ${
                  isKeyStat ? "border-white/20 shadow-lg shadow-[#FF6B00]/5" : "border-white/10"
                } hover:border-[#FF6B00]/50 transition-all duration-300 rounded-none relative overflow-hidden flex flex-col justify-between`}
              >
                <div>
                  <span className={`text-[10px] font-mono tracking-widest block uppercase font-bold ${
                    isKeyStat ? "text-[#FF6B00]" : "text-white/50"
                  }`}>
                    {labelMap[key]}
                  </span>
                  <div className={`text-3xl md:text-4xl font-extrabold font-mono mt-2 tracking-tight ${
                    isKeyStat ? "text-white" : "text-white/90"
                  }`}>
                    {proj.toFixed(1)}
                  </div>
                </div>

                {/* Micro slider chart mapping confidence limits */}
                <div className="mt-5 pt-3 border-t border-white/10 flex flex-col gap-1.5">
                  <div className="flex justify-between text-[10px] font-mono text-white/40 font-medium">
                    <span>{low.toFixed(1)}</span>
                    <span>{high.toFixed(1)}</span>
                  </div>
                  <div className="h-[3px] bg-white/15 w-full relative rounded-full">
                    {/* Confidence Range Span */}
                    <div 
                      style={{ left: `${lowPercent}%`, right: `${100 - (high / totalScale) * 100}%` }} 
                      className={`absolute h-full rounded-full ${
                        isKeyStat ? "bg-[#FF6B00]/30" : "bg-white/20"
                      }`}
                    ></div>
                    {/* Proj dot */}
                    <div 
                      style={{ left: `${projPercent}%` }} 
                      className={`absolute -top-[2px] w-2 h-2 rounded-full -translate-x-1/2 ${
                        isKeyStat ? "bg-[#FF6B00] shadow-md shadow-[#FF6B00]/50" : "bg-white"
                      }`}
                    ></div>
                  </div>
                  <span className="text-[9px] text-center text-white/55 font-mono tracking-wider mt-1 uppercase font-semibold">
                    Err: ±{(rmse[key] || 0).toFixed(1)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SVG Historical Chart of performance */}
      <div className="border border-white/10 bg-[#050505] p-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[9px] font-mono font-semibold text-white/60 uppercase tracking-widest">
            Istoric Tranzitoriu de Formă ({selectedMetric})
          </span>
          <div className="flex gap-1">
            {(["PTS", "TRB", "AST", "MIN"] as const).map(met => (
              <button
                key={met}
                id={`metric-btn-${met}`}
                onClick={() => setSelectedMetric(met)}
                className={`py-1 px-2.5 font-mono text-[9px] tracking-wider uppercase transition-colors ${
                  selectedMetric === met 
                    ? "bg-[#FF6B00] text-white font-bold" 
                    : "bg-white/5 text-white/40 hover:text-white"
                }`}
              >
                {met}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Chart Area */}
        <div className="h-24 w-full relative">
          <svg className="w-full h-full overflow-visible" viewBox="0 0 500 100" preserveAspectRatio="none">
            {/* Horizontal helper grids */}
            <line x1="0" y1="20" x2="500" y2="20" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" strokeDasharray="3,3" />
            <line x1="0" y1="60" x2="500" y2="60" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" strokeDasharray="3,3" />
            <line x1="0" y1="100" x2="500" y2="100" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />

            {/* Path representing metric over dates */}
            {sparklineData.length > 1 && (
              <>
                <path
                  d={`M ${sparklineData.map((val, idx) => {
                    const x = (idx / (sparklineData.length - 1)) * 500;
                    const y = 80 - ((val - minMetricVal) / range) * 70;
                    return `${x} ${y}`;
                  }).join(" L ")}`}
                  fill="none"
                  stroke="#FF6B00"
                  strokeWidth="2"
                />
                
                {/* Dots on nodes */}
                {sparklineData.map((val, idx) => {
                  const x = (idx / (sparklineData.length - 1)) * 500;
                  const y = 80 - ((val - minMetricVal) / range) * 70;
                  return (
                    <g key={idx} className="group/dot cursor-pointer">
                      <circle cx={x} cy={y} r="3" fill="#FF6B00" stroke="#050505" strokeWidth="1" />
                    </g>
                  );
                })}
              </>
            )}
          </svg>

          {/* Sparkline Legends */}
          <div className="absolute top-1 right-2 text-[8px] font-mono text-white/30 lowercase">
            max: {maxMetricVal} {selectedMetric}
          </div>
          <div className="absolute bottom-1 right-2 text-[8px] font-mono text-white/30 lowercase">
            min: {minMetricVal} {selectedMetric}
          </div>
          <div className="absolute left-0 right-0 bottom-[-5px] flex justify-between text-[8px] font-mono text-white/30 px-1">
            {logs.map((l, idx) => (
              <span key={idx} className="block truncate max-w-[45px] lowercase">
                vs {l.Opp}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Tabular Game Log list - limits details dynamically */}
      <div className="border border-white/10 bg-[#050505]">
        <div className="px-4 py-3 bg-[#0F0F0F] border-b border-white/10 flex items-center justify-between">
          <span className="text-[9px] font-mono font-semibold text-white/40 uppercase tracking-widest">
            Istoric Parquet (Ultimele Meciuri)
          </span>
          <span className="text-[9px] font-mono text-[#FF6B00] uppercase tracking-wider">{logs.length} înregistrări local</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[10px] text-left border-collapse font-sans">
            <thead>
              <tr className="border-b border-white/10 bg-[#0C0C0C] text-white/40 uppercase font-mono text-[8px] tracking-wider">
                <th className="p-3 text-center">Dată</th>
                <th className="p-3 text-center">Locație</th>
                <th className="p-3 text-center">Oponent</th>
                <th className="p-3 text-center">Min</th>
                <th className="p-3 text-center text-[#FF6B00]">PTS</th>
                <th className="p-3 text-center text-white/80">TRB</th>
                <th className="p-3 text-center text-white/80">AST</th>
                <th className="p-3 text-center">3PT</th>
                <th className="p-3 text-center">FG</th>
                <th className="p-3 text-center">PF</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, idx) => (
                <tr key={idx} className="border-b border-white/5 hover:bg-white/5 text-white/80 font-mono">
                  <td className="p-3 text-center text-white/40 truncate">{log.Date}</td>
                  <td className="p-3 text-center">
                    <span className={`px-1 rounded-none text-[8px] font-bold ${
                      log.Home ? "text-[#FF6B00]" : "text-white/45"
                    }`}>
                      {log.Home ? "ACASĂ" : "DEPL"}
                    </span>
                  </td>
                  <td className="p-3 text-center font-bold text-white/90">{log.Opp}</td>
                  <td className="p-3 text-center text-white/50">{log.MIN}</td>
                  <td className="p-3 text-center font-extrabold text-[#FF6B00]">{log.PTS}</td>
                  <td className="p-3 text-center font-bold text-white/80">{log.TRB}</td>
                  <td className="p-3 text-center font-bold text-white/80">{log.AST}</td>
                  <td className="p-3 text-center text-white/50">{log["3PT"]}</td>
                  <td className="p-3 text-center text-white/50">{log.FG}</td>
                  <td className="p-3 text-center text-white/30">{log.PF}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
