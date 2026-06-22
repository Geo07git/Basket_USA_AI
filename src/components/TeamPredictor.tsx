/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { TeamStats } from "../types";
import { predictGameMatchup } from "../data";
import { Info, HelpCircle, Trophy, BarChart2, ShieldAlert } from "lucide-react";
import { motion } from "motion/react";

interface TeamPredictorProps {
  teams: TeamStats[];
}

export default function TeamPredictor({ teams }: TeamPredictorProps) {
  const [team1Id, setTeam1Id] = useState(teams[0]?.id || "");
  const [team2Id, setTeam2Id] = useState(teams[1]?.id || "");
  const [location, setLocation] = useState("home"); // "home" | "away" | "neutral"

  // Sync state if teams list updates (e.g. when changing leagues or importing custom datasets)
  React.useEffect(() => {
    if (teams && teams.length > 0) {
      setTeam1Id(teams[0]?.id || "");
      setTeam2Id(teams[1]?.id || teams[0]?.id || "");
    }
  }, [teams]);

  const team1 = teams.find((t) => t.id === team1Id) || teams[0];
  const team2 = teams.find((t) => t.id === team2Id) || teams[1] || teams[0];

  // Adjust location string
  const locationLabel = 
    location === "home" 
      ? team1.name 
      : location === "away" 
        ? team2.name 
        : "Teren neutru";

  const { margin, total_points, prob_win, details } = predictGameMatchup(team1, team2, locationLabel);

  const t1_pts = (total_points + margin) / 2;
  const t2_pts = (total_points - margin) / 2;
  const winner = margin > 0 ? team1 : team2;

  // Render SVG points spread bell curve
  // Under normal distribution, the difference follows N(margin, 12.5)
  // Let's draw a beautiful smooth curve
  const points: { x: number; y: number }[] = [];
  const mean = margin;
  const stdDev = 12.5;
  for (let i = -35; i <= 35; i += 2) {
    const x = i;
    // Gaussian formula
    const exponent = -Math.pow(x - mean, 2) / (2 * Math.pow(stdDev, 2));
    const y = (1 / (stdDev * Math.sqrt(2 * Math.PI))) * Math.exp(exponent) * 1000;
    points.push({ x, y });
  }

  // Find min and max for svg scaling
  const maxValY = Math.max(...points.map(p => p.y));

  return (
    <div id="team-prediction-card" className="bg-[#0F0F0F] border border-white/10 rounded-none p-6 relative">
      
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xs uppercase tracking-[0.4em] border-l-4 border-[#FF6B00] pl-3 font-bold">
          Matchup Analysis
        </h2>
        <span className="text-[9px] font-mono text-white/40 tracking-wider bg-white/5 px-2.5 py-1">
          MONTE CARLO PROJECTIONS
        </span>
      </div>

      {/* Select Teams */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="space-y-1.5">
          <label className="text-[10px] font-mono tracking-widest text-white/40 flex items-center justify-between uppercase">
            <span>🏠 GAZDE (TEAM A)</span>
            <span className="text-[9px] font-mono text-[#FF6B00] bg-[#FF6B00]/10 px-1.5">{team1.seasonRecord}</span>
          </label>
          <select
            id="home-team-select"
            value={team1Id}
            onChange={(e) => setTeam1Id(e.target.value)}
            className="w-full bg-[#151515] border border-white/10 rounded-none px-4 py-3 text-white text-xs font-mono uppercase tracking-tight focus:outline-none focus:border-[#FF6B00] transition-colors"
          >
            {teams.map((t) => (
              <option key={t.id} value={t.id} disabled={t.id === team2Id}>
                {t.name} ({t.abbreviation})
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-mono tracking-widest text-white/40 flex items-center justify-between uppercase">
            <span>🚗 OASPEȚI (TEAM B)</span>
            <span className="text-[9px] font-mono text-[#FF6B00] bg-[#FF6B00]/10 px-1.5">{team2.seasonRecord}</span>
          </label>
          <select
            id="away-team-select"
            value={team2Id}
            onChange={(e) => setTeam2Id(e.target.value)}
            className="w-full bg-[#151515] border border-white/10 rounded-none px-4 py-3 text-white text-xs font-mono uppercase tracking-tight focus:outline-none focus:border-[#FF6B00] transition-colors"
          >
            {teams.map((t) => (
              <option key={t.id} value={t.id} disabled={t.id === team1Id}>
                {t.name} ({t.abbreviation})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Location Radio Toggle */}
      <div className="bg-[#151515] p-4 border border-white/10 rounded-none mb-6">
        <span className="block text-[9px] font-mono tracking-widest font-semibold text-white/40 mb-3 uppercase">
          📍 Locația Meciului și Factorul de Teren Adaptiv
        </span>
        <div className="grid grid-cols-3 gap-2">
          <button
            id="location-home-btn"
            onClick={() => setLocation("home")}
            className={`py-2 px-3 border text-xs font-mono uppercase tracking-wider transition-all ${
              location === "home"
                ? "bg-[#FF6B00] text-white border-[#FF6B00]"
                : "bg-transparent text-white/50 border-white/10 hover:text-white hover:border-white/30"
            }`}
          >
            {team1.abbreviation} (Acasă)
          </button>
          <button
            id="location-away-btn"
            onClick={() => setLocation("away")}
            className={`py-2 px-3 border text-xs font-mono uppercase tracking-wider transition-all ${
              location === "away"
                ? "bg-[#FF6B00] text-white border-[#FF6B00]"
                : "bg-transparent text-white/50 border-white/10 hover:text-white hover:border-white/30"
            }`}
          >
            {team2.abbreviation} (Acasă)
          </button>
          <button
            id="location-neutral-btn"
            onClick={() => setLocation("neutral")}
            className={`py-2 px-3 border text-xs font-mono uppercase tracking-wider transition-all ${
              location === "neutral"
                ? "bg-[#FF6B00] text-white border-[#FF6B00]"
                : "bg-transparent text-white/50 border-white/10 hover:text-white hover:border-white/30"
            }`}
          >
            Teren Neutru
          </button>
        </div>
      </div>

      {/* Main Prediction Scoreboard */}
      <div className="bg-gradient-to-br from-[#121212] to-[#0A0A0A] border border-white/10 rounded-none p-6 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          
          {/* Team A Score */}
          <div className="text-center flex-1">
            <span className="inline-block px-3 py-1 text-[10px] font-mono tracking-widest text-[#F5F5F5] bg-white/5 border border-white/10 uppercase mb-2">
              {team1.name}
            </span>
            <div className="text-5xl font-mono text-white tracking-widest mt-1 font-bold">
              {t1_pts.toFixed(0)}
            </div>
            <div className="text-[10px] text-white/40 mt-3 font-mono space-y-0.5 uppercase tracking-wider">
              <span className="block">Off Rating: {team1.offenseRating}</span>
              <span className="block text-[9px] text-[#FF6B00]">Pace factor: {team1.pace}</span>
            </div>
          </div>

          {/* VS Divider with win percentage */}
          <div className="text-center px-4 self-stretch flex flex-col justify-center items-center relative">
            <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-white/10 hidden md:block"></div>
            <div className="bg-black border border-white/15 px-3 py-1 text-xs font-bold font-mono tracking-widest text-[#FF6B00] z-10 my-2">
              VS
            </div>
            <span className="text-[9px] text-white/45 font-mono uppercase tracking-widest">🏆 Câștigător Estimis</span>
            <span className="text-[#FF6B00] font-bold text-sm tracking-widest truncate max-w-[150px] uppercase mt-0.5">{winner.abbreviation} ±{Math.abs(margin).toFixed(0)}</span>
          </div>

          {/* Team B Score */}
          <div className="text-center flex-1">
            <span className="inline-block px-3 py-1 text-[10px] font-mono tracking-widest text-[#F5F5F5] bg-white/5 border border-white/10 uppercase mb-2">
              {team2.name}
            </span>
            <div className="text-5xl font-mono text-white tracking-widest mt-1 font-bold">
              {t2_pts.toFixed(0)}
            </div>
            <div className="text-[10px] text-white/40 mt-3 font-mono space-y-0.5 uppercase tracking-wider">
              <span className="block">Off Rating: {team2.offenseRating}</span>
              <span className="block text-[9px] text-[#FF6B00]">Pace factor: {team2.pace}</span>
            </div>
          </div>

        </div>

        {/* Win Probability Bar */}
        <div className="mt-8 pt-6 border-t border-white/10">
          <div className="flex justify-between items-center text-[10px] uppercase tracking-widest text-white/50 font-mono mb-2">
            <span>Probabilitate {team1.abbreviation} • <b>{(prob_win * 100).toFixed(1)}%</b></span>
            <span>{team2.abbreviation} • <b>{((1 - prob_win) * 100).toFixed(1)}%</b></span>
          </div>
          <div className="w-full h-1 bg-white/10 flex">
            <div 
              id="team1-win-prob-bar"
              style={{ width: `${prob_win * 100}%` }} 
              className="h-full bg-[#FF6B00] transition-all duration-500 ease-out"
            ></div>
            <div 
              id="team2-win-prob-bar"
              style={{ width: `${(1 - prob_win) * 100}%` }} 
              className="h-full bg-white/20 transition-all duration-500 ease-out"
            ></div>
          </div>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-0 border border-white/10 bg-[#121212] mb-6">
        <div className="p-4 flex flex-col justify-between">
          <span className="text-[9px] font-mono tracking-widest text-white/40 block uppercase">🏆 Diferență scor</span>
          <div className="text-xl font-bold text-white mt-1 uppercase font-mono">
            {winner.abbreviation} {margin > 0 ? "+" : ""}{margin.toFixed(1)} <span className="text-xs text-white/45 font-normal">pct</span>
          </div>
        </div>

        <div className="p-4 border-t sm:border-t-0 sm:border-x border-white/10 flex flex-col justify-between">
          <span className="text-[9px] font-mono tracking-widest text-white/40 block uppercase">📊 Estimare Scor Total</span>
          <div className="text-xl font-bold text-white mt-1 font-mono">
            {total_points.toFixed(0)} <span className="text-xs text-[#FF6B00] font-normal">O/U</span>
          </div>
        </div>

        <div className="p-4 border-t sm:border-t-0 flex flex-col justify-between">
          <span className="text-[9px] font-mono tracking-widest text-white/40 block uppercase">⚡ Probabilitate</span>
          <div className="text-xl font-bold text-[#FF6B00] mt-1 font-mono">
            {winner === team1 ? (prob_win * 100).toFixed(0) : ((1 - prob_win) * 100).toFixed(0)}%
          </div>
        </div>
      </div>

      {/* Advanced Explainable AI visualization: Bell Curve spread */}
      <div className="border border-white/10 bg-[#050505] p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] font-mono font-semibold tracking-widest text-white/60 uppercase">
            Curba de Distribuție Gauss a Diferenței de Scor ({team1.abbreviation} vs {team2.abbreviation})
          </span>
        </div>
        <div className="relative h-24 w-full flex items-end justify-center pt-2">
          {/* Custom SVG Path for normal distribution curves */}
          <svg className="w-full h-full overflow-visible" preserveAspectRatio="none">
            <defs>
              <linearGradient id="curveGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FF6B00" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#FF6B00" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Zero spread reference line */}
            <line 
              x1="50%" 
              y1="0" 
              x2="50%" 
              y2="100" 
              stroke="#ef4444" 
              strokeDasharray="2,2" 
              strokeWidth="1"
            />

            {/* Mean (Calculated margin) projected line */}
            <line 
              x1={`${50 + (mean / 35) * 50}%`} 
              y1="0" 
              x2={`${50 + (mean / 35) * 50}%`} 
              y2="100" 
              stroke="#FF6B00" 
              strokeWidth="2"
            />

            {/* Ground line */}
            <line x1="0" y1="100" x2="100%" y2="100" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />

            {/* Curve path */}
            <path
              d={`M 0 100 ${points.map((p, idx) => {
                const widthPct = ((p.x + 35) / 70) * 100;
                const heightVal = 100 - (p.y / maxValY) * 85;
                return `L ${widthPct}% ${heightVal}`;
              }).join(" ")} L 100% 100 Z`}
              fill="url(#curveGradient)"
              stroke="#FF6B00"
              strokeWidth="2.5"
            />
          </svg>

          {/* Reference legends */}
          <div className="absolute left-2 bottom-1 text-[9px] font-mono uppercase text-white/30 tracking-widest">
            {team2.abbreviation} DOMINĂ
          </div>
          <div className="absolute right-2 bottom-1 text-[9px] font-mono uppercase text-white/30 tracking-widest">
            {team1.abbreviation} DOMINĂ
          </div>
          <div 
            style={{ left: `${50 + (mean / 35) * 50}%`, transform: "translateX(-50%)" }}
            className="absolute top-1 bg-black text-[9px] font-mono border border-white/15 text-[#FF6B00] px-2 py-0.5 rounded-none z-10 uppercase tracking-wider"
          >
            Medie: {mean > 0 ? "+" : ""}{mean.toFixed(1)} pct
          </div>
        </div>
      </div>

      {/* Model Technical details expander */}
      <details className="group/details border border-white/10 bg-[#050505] rounded-none overflow-hidden">
        <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 select-none transition-colors">
          <span className="text-[10px] font-semibold text-white/70 font-mono uppercase tracking-widest">
            📋 Parametrii Matematici ai Modelului
          </span>
          <span className="text-[10px] text-[#FF6B00] font-mono tracking-widest uppercase">
            [+] DETALII SPREAD
          </span>
        </summary>
        <div className="p-4 pt-0 border-t border-white/10 text-[11px] font-mono text-white/50 space-y-3">
          <p className="leading-relaxed font-serif italic text-xs">
            Sistemul estimează un factor adițional de posesie și un coeficient ajustat pe baza ratingului net al echipei pe teren propriu/deplasare.
          </p>
          <div className="bg-[#121212] p-3 text-[10px] text-[#FF6B00] font-mono overflow-x-auto border border-white/5 leading-relaxed">
            {"Pace_Projected = (Pace_Home + Pace_Away) / 2"}<br />
            {"Rating_Home_Adj = Rating_Home_Off + HomeCourtWeight + (League_Avg_Def - Rating_Away_Def) * 0.55"}<br />
            {"Score_Home = (Rating_Home_Adj * (Pace_Projected / 100)) * (1 + Rest_Home_Factor)"}<br />
            {"Margin = Score_Home - Score_Away"}
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10px] uppercase tracking-wider pt-2 border-t border-white/5">
            <div>• Posesii estimate: <span className="text-white font-bold">{details.projected_possessions}</span></div>
            <div>• Ajustare odihnă Gazde: <span className="text-white font-bold">{details.rest_adjustment_home}</span></div>
            <div>• Ajustare odihnă Oaspeți: <span className="text-white font-bold">{details.rest_adjustment_away}</span></div>
            <div>• Rețea: <span className="text-white font-bold">{details.mathematical_link}</span></div>
          </div>
        </div>
      </details>
    </div>
  );
}
