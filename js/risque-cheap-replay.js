/**
 * Battle stills tier (`battle_stills`, legacy `host_ultra`): phase-end board snapshots (deal, opening deploy,
 * each player's turn deploy, end of attack phase, end of reinforce). RAM only during play; flushed to the
 * session REPLAY folder as rqwb-still-*.json + rqwb-stills-manifest.json. Not written into localStorage.
 */
(function () {
  "use strict";

  var STILL_FORMAT = "risque-replay-still-v1";
  var MANIFEST_FORMAT = "risque-replay-stills-manifest-v1";
  var FILE_PREFIX = "rqwb-still-";

  function tierBattleStills(gs) {
    if (!gs || typeof gs !== "object" || window.risqueDisplayIsPublic) return false;
    var t = gs.risqueAutosaveTier != null ? String(gs.risqueAutosaveTier).trim() : "";
    return t === "battle_stills" || t === "host_ultra";
  }

  function snapshotBoard(gs) {
    if (typeof window.risqueReplaySnapshotBoardForStills === "function") {
      return window.risqueReplaySnapshotBoardForStills(gs);
    }
    var out = {};
    if (!gs || !gs.players) return out;
    gs.players.forEach(function (p) {
      if (!p || !p.name) return;
      (p.territories || []).forEach(function (t) {
        if (!t || !t.name) return;
        out[t.name] = { owner: String(p.name), troops: Number(t.troops) || 0 };
      });
    });
    return out;
  }

  function mergePlayerColorsFromState(gs) {
    var m = {};
    if (!gs || !Array.isArray(gs.players)) return m;
    gs.players.forEach(function (p) {
      if (!p || !p.name || p.color == null || String(p.color).trim() === "") return;
      m[String(p.name).trim().toLowerCase()] = String(p.color).trim().toLowerCase();
    });
    return m;
  }

  /** Full color map for still + Wayback: replay table, live players, and board owner names. */
  function snapshotPlayerColorsAtCapture(gs, board) {
    var m = {};
    if (!gs) return m;
    if (gs.risqueReplayPlayerColors && typeof gs.risqueReplayPlayerColors === "object") {
      Object.keys(gs.risqueReplayPlayerColors).forEach(function (k) {
        var kk = String(k).trim().toLowerCase();
        if (!kk) return;
        var v = gs.risqueReplayPlayerColors[k];
        if (v != null && String(v).trim() !== "") m[kk] = String(v).trim().toLowerCase();
      });
    }
    (gs.players || []).forEach(function (p) {
      if (!p || !p.name || p.color == null || String(p.color).trim() === "") return;
      m[String(p.name).trim().toLowerCase()] = String(p.color).trim().toLowerCase();
    });
    if (board && typeof board === "object") {
      Object.keys(board).forEach(function (tname) {
        var cell = board[tname];
        if (!cell || !cell.owner) return;
        var low = String(cell.owner).trim().toLowerCase();
        if (!low || m[low]) return;
        var pi;
        for (pi = 0; pi < (gs.players || []).length; pi++) {
          var p = gs.players[pi];
          if (!p || !p.name) continue;
          if (String(p.name).trim().toLowerCase() === low && p.color != null && String(p.color).trim() !== "") {
            m[low] = String(p.color).trim().toLowerCase();
            return;
          }
        }
      });
    }
    var stateM = mergePlayerColorsFromState(gs);
    Object.keys(stateM).forEach(function (k) {
      if (!m[k] || String(m[k]).trim() === "") m[k] = stateM[k];
    });
    return m;
  }

  function defaultCaption(kind, gs) {
    var r = Math.max(1, Number(gs && gs.round) || 1);
    var who = gs && gs.currentPlayer != null ? String(gs.currentPlayer).trim() : "";
    if (kind === "deal") return "Round " + r + " — Deal complete";
    if (kind === "post_setup_deploy") return "Round " + r + " — Opening deployment complete (all players)";
    if (kind === "turn_deploy") return "Round " + r + " — " + (who || "?") + " — Turn deployment complete";
    if (kind === "attack_phase") return "Round " + r + " — " + (who || "?") + " — Attack phase complete";
    if (kind === "reinforce") return "Round " + r + " — " + (who || "?") + " — Reinforcement complete";
    return "Round " + r + " — " + (who || "?");
  }

  function ensureTapeKey(gs) {
    if (!gs || typeof gs !== "object") return;
    if (gs.risqueReplayTapeSessionKey) return;
    if (typeof window.risqueReplayEnsureTapeSessionKey === "function") {
      try {
        window.risqueReplayEnsureTapeSessionKey(gs);
      } catch (eK) {
        /* ignore */
      }
    }
    if (!gs.risqueReplayTapeSessionKey) {
      try {
        gs.risqueReplayTapeSessionKey =
          typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
            ? crypto.randomUUID()
            : "rsq-" + String(Date.now()) + "-" + String(Math.floor(Math.random() * 1e9));
      } catch (eF) {
        /* ignore */
      }
    }
  }

  function ensureStillsArray(gs) {
    if (!Array.isArray(gs.risqueCheapReplayStills)) gs.risqueCheapReplayStills = [];
  }

  function bumpFrameSeq(gs) {
    if (typeof gs.risqueCheapReplayFrameSeq !== "number" || !isFinite(gs.risqueCheapReplayFrameSeq)) {
      gs.risqueCheapReplayFrameSeq = 0;
    }
    gs.risqueCheapReplayFrameSeq += 1;
    return gs.risqueCheapReplayFrameSeq;
  }

  function pushPhaseStill(gs, internalKind, captionOpt) {
    if (!tierBattleStills(gs)) return;
    ensureTapeKey(gs);
    ensureStillsArray(gs);
    var seq = bumpFrameSeq(gs);
    var round = Math.max(1, Number(gs.round) || 1);
    var board = snapshotBoard(gs);
    if (!board || !Object.keys(board).length) return;
    var colorsSnap = snapshotPlayerColorsAtCapture(gs, board);
    var cap = captionOpt != null && String(captionOpt).trim() !== "" ? String(captionOpt).trim() : defaultCaption(internalKind, gs);
    var slug = String(internalKind || "frame").replace(/[^a-z0-9_\-]/gi, "_");
    var fileLeaf = FILE_PREFIX + "r" + round + "-f" + seq + "-" + slug + ".json";
    gs.risqueCheapReplayStills.push({
      fileName: fileLeaf,
      kind: internalKind,
      round: round,
      actor: gs.currentPlayer != null ? String(gs.currentPlayer).trim() : "",
      board: board,
      playerColorsSnap: colorsSnap,
      caption: cap
    });
  }

  window.risqueCheapReplayClear = function (gs) {
    if (!gs || typeof gs !== "object") return;
    try {
      delete gs.risqueCheapReplayStills;
      delete gs.risqueCheapReplayFrameSeq;
      delete gs.risqueCheapReplayBattleSeq;
    } catch (eC) {
      /* ignore */
    }
  };

  window.risqueCheapReplayCapturePostDeal = function (gs) {
    if (!tierBattleStills(gs)) return;
    pushPhaseStill(gs, "deal", null);
  };

  window.risqueCheapReplayCapturePostSetupDeploy = function (gs) {
    if (!tierBattleStills(gs)) return;
    pushPhaseStill(gs, "post_setup_deploy", null);
  };

  /** After income deploy: current player placed all reinforcements from bank → attack. */
  window.risqueCheapReplayCaptureTurnDeployDone = function (gs) {
    if (!tierBattleStills(gs)) return;
    pushPhaseStill(gs, "turn_deploy", null);
  };

  /** When the active player leaves the attack phase (→ reinforce). */
  window.risqueCheapReplayCaptureAttackPhaseDone = function (gs) {
    if (!tierBattleStills(gs)) return;
    pushPhaseStill(gs, "attack_phase", null);
  };

  /** After reinforcement step → receive-card. */
  window.risqueCheapReplayCaptureReinforceDone = function (gs) {
    if (!tierBattleStills(gs)) return;
    pushPhaseStill(gs, "reinforce", null);
  };

  window.risqueCheapReplayFlushToDisk = function (gs) {
    if (!gs || window.risqueDisplayIsPublic) return Promise.resolve(false);
    if (!tierBattleStills(gs)) return Promise.resolve(false);
    var rows = gs.risqueCheapReplayStills;
    if (!Array.isArray(rows) || !rows.length) return Promise.resolve(false);
    if (
      typeof window.risqueSessionDiskHasWritableSaveTarget === "function" &&
      !window.risqueSessionDiskHasWritableSaveTarget()
    ) {
      return Promise.resolve(false);
    }
    if (typeof window.risqueSessionDiskEnsureReplayDirHandle !== "function") {
      return Promise.resolve(false);
    }
    ensureTapeKey(gs);
    var mergedColors = {};
    var ci;
    for (ci = 0; ci < rows.length; ci++) {
      var snap = rows[ci].playerColorsSnap;
      if (!snap || typeof snap !== "object") continue;
      Object.keys(snap).forEach(function (k) {
        var kk = String(k).trim().toLowerCase();
        if (!kk) return;
        mergedColors[kk] = String(snap[k]).trim().toLowerCase();
      });
    }
    var endColors = mergePlayerColorsFromState(gs);
    Object.keys(endColors).forEach(function (k) {
      var kk = String(k).trim().toLowerCase();
      if (kk) mergedColors[kk] = String(endColors[k]).trim().toLowerCase();
    });
    var sk = gs.risqueReplayTapeSessionKey != null ? String(gs.risqueReplayTapeSessionKey) : "";
    var manifest = {
      format: MANIFEST_FORMAT,
      sessionKey: sk || null,
      savedAt: Date.now(),
      playerColors: mergedColors,
      frames: []
    };
    var writeFn = window.risqueSessionDiskWriteTextFile;
    if (typeof writeFn !== "function") return Promise.resolve(false);

    return window.risqueSessionDiskEnsureReplayDirHandle(gs).then(function (replayDir) {
      if (!replayDir) return false;
      var chain = Promise.resolve(true);
      var ri;
      for (ri = 0; ri < rows.length; ri++) {
        (function (row) {
          var fname = row.fileName ? String(row.fileName) : "";
          if (!fname || fname.indexOf("..") >= 0) return;
          var cap = row.caption != null ? String(row.caption) : "";
          var body = {
            format: STILL_FORMAT,
            kind: row.kind,
            round: row.round,
            actor: row.actor || "",
            caption: cap,
            board: row.board,
            playerColors:
              row.playerColorsSnap && typeof row.playerColorsSnap === "object" ? row.playerColorsSnap : {}
          };
          var json;
          try {
            json = JSON.stringify(body, null, 2);
          } catch (eJ) {
            json = null;
          }
          if (!json) return;
          chain = chain.then(function () {
            return writeFn(replayDir, fname, json).then(function (ok) {
              return !!ok;
            });
          });
          manifest.frames.push({
            file: fname,
            kind: row.kind,
            round: row.round,
            actor: row.actor || "",
            caption: cap
          });
        })(rows[ri]);
      }
      return chain.then(function () {
        var mj;
        try {
          mj = JSON.stringify(manifest, null, 2);
        } catch (eM) {
          mj = null;
        }
        if (!mj) return false;
        return writeFn(replayDir, "rqwb-stills-manifest.json", mj).then(function (okM) {
          if (okM) {
            try {
              delete gs.risqueCheapReplayStills;
              delete gs.risqueCheapReplayFrameSeq;
              delete gs.risqueCheapReplayBattleSeq;
            } catch (eClr) {
              /* ignore */
            }
          }
          return !!okM;
        });
      });
    });
  };

  var TAPE_V_BUDGET = 2;
  var BUDGET_FRAME_MS = 1000;

  function boardJsonStableForBudget(b) {
    if (!b || typeof b !== "object") return "";
    var keys = Object.keys(b).sort();
    var parts = [];
    var i;
    for (i = 0; i < keys.length; i++) {
      var k = keys[i];
      var c = b[k];
      if (!c || typeof c !== "object") continue;
      parts.push(
        k +
          ":" +
          String(c.owner != null ? c.owner : "").trim().toLowerCase() +
          ":" +
          String(Number(c.troops) || 0)
      );
    }
    return parts.join("|");
  }

  function cloneBoardForBudget(b) {
    if (!b || typeof b !== "object") return {};
    try {
      return JSON.parse(JSON.stringify(b));
    } catch (eC) {
      return {};
    }
  }

  function stillKindToReplaySegment(kind) {
    var k = String(kind || "").trim();
    if (k === "deal") return "deal";
    if (k === "post_setup_deploy" || k === "turn_deploy") return "deploy";
    if (k === "attack_phase") return "battle";
    if (k === "reinforce") return "reinforce";
    return "battle";
  }

  function phaseToBudgetSegment(phase) {
    var p = String(phase || "").trim().toLowerCase();
    if (p === "deploy" || p === "deal") return "deploy";
    if (p === "attack" || p === "pending_transfer") return "battle";
    if (p === "reinforce" || p === "receive-card" || p.indexOf("cardplay") >= 0) return "reinforce";
    return "battle";
  }

  /**
   * SAVE + REPLAY while on battle_stills: synthesize risque-replay-v1 from in-RAM phase stills (deal → last
   * captured phase) plus an optional one-frame tail when the live board differs (mid-phase manual save).
   */
  window.risqueBuildBudgetReplayPackFromCheapStills = function (gs) {
    if (!gs || typeof gs !== "object") return null;
    var tier = gs.risqueAutosaveTier != null ? String(gs.risqueAutosaveTier).trim() : "";
    if (tier !== "battle_stills" && tier !== "host_ultra") return null;

    var rows = Array.isArray(gs.risqueCheapReplayStills) ? gs.risqueCheapReplayStills.slice() : [];
    var mergedColors = {};
    var ci;
    for (ci = 0; ci < rows.length; ci++) {
      var snap = rows[ci] && rows[ci].playerColorsSnap;
      if (!snap || typeof snap !== "object") continue;
      Object.keys(snap).forEach(function (k2) {
        var kk = String(k2).trim().toLowerCase();
        if (kk) mergedColors[kk] = String(snap[k2]).trim().toLowerCase();
      });
    }
    var endColors = mergePlayerColorsFromState(gs);
    Object.keys(endColors).forEach(function (k2) {
      var kk = String(k2).trim().toLowerCase();
      if (kk) mergedColors[kk] = String(endColors[k2]).trim().toLowerCase();
    });
    if (gs.risqueReplayPlayerColors && typeof gs.risqueReplayPlayerColors === "object") {
      Object.keys(gs.risqueReplayPlayerColors).forEach(function (k2) {
        var kk = String(k2).trim().toLowerCase();
        if (kk && gs.risqueReplayPlayerColors[k2] != null && String(gs.risqueReplayPlayerColors[k2]).trim() !== "") {
          mergedColors[kk] = String(gs.risqueReplayPlayerColors[k2]).trim().toLowerCase();
        }
      });
    }

    var events = [];
    var maxR = Math.max(1, Number(gs.round) || 1);
    var firstBoard = {};
    if (rows.length && rows[0].board && typeof rows[0].board === "object" && Object.keys(rows[0].board).length) {
      firstBoard = cloneBoardForBudget(rows[0].board);
    } else {
      firstBoard = cloneBoardForBudget(snapshotBoard(gs));
    }
    if (!firstBoard || !Object.keys(firstBoard).length) return null;

    var colorsForInit = {};
    try {
      colorsForInit = JSON.parse(JSON.stringify(mergedColors));
    } catch (eCol) {
      colorsForInit = mergedColors;
    }

    events.push({
      type: "init",
      round: 1,
      board: cloneBoardForBudget(firstBoard),
      playerColors: colorsForInit
    });

    var ri;
    for (ri = 0; ri < rows.length; ri++) {
      var row = rows[ri];
      if (!row || !row.board || typeof row.board !== "object" || !Object.keys(row.board).length) continue;
      var seg = stillKindToReplaySegment(row.kind);
      var r = Math.max(1, Number(row.round) || 1);
      if (r > maxR) maxR = r;
      var actor = row.actor != null ? String(row.actor).trim() : "";
      var cap =
        row.caption != null && String(row.caption).trim() !== ""
          ? String(row.caption).trim()
          : defaultCaption(row.kind, gs);
      events.push({
        type: "board",
        segment: seg,
        board: cloneBoardForBudget(row.board),
        round: r,
        recordedForPlayer: actor,
        risqueReplayNarration: cap,
        risqueReplayFixedDelayMs: BUDGET_FRAME_MS
      });
    }

    if (!rows.length) {
      events.push({
        type: "board",
        segment: "deploy",
        board: cloneBoardForBudget(firstBoard),
        round: Math.max(1, Number(gs.round) || 1),
        recordedForPlayer: gs.currentPlayer != null ? String(gs.currentPlayer).trim() : "",
        risqueReplayNarration: "Budget replay — no phase stills captured yet (saved very early).",
        risqueReplayFixedDelayMs: BUDGET_FRAME_MS
      });
    }

    var lastJ = "";
    if (rows.length && rows[rows.length - 1] && rows[rows.length - 1].board) {
      lastJ = boardJsonStableForBudget(rows[rows.length - 1].board);
    }
    var tailBoard = snapshotBoard(gs);
    var tailJ = boardJsonStableForBudget(tailBoard);
    if (rows.length && tailJ !== lastJ && tailBoard && Object.keys(tailBoard).length) {
      var tr = Math.max(1, Number(gs.round) || 1);
      if (tr > maxR) maxR = tr;
      var who = gs.currentPlayer != null ? String(gs.currentPlayer).trim() : "";
      events.push({
        type: "board",
        segment: phaseToBudgetSegment(gs.phase),
        board: cloneBoardForBudget(tailBoard),
        round: tr,
        recordedForPlayer: who,
        risqueReplayNarration: "Manual save — board at this moment (mid-phase snapshot).",
        risqueReplayFixedDelayMs: BUDGET_FRAME_MS
      });
    }

    if (events.length < 2) return null;

    var hasDealFrames = events.some(function (e) {
      return e && e.type === "board" && e.segment === "deal";
    });

    return {
      format: "risque-replay-v1",
      replayScope: "session",
      replayRound: maxR,
      tapeFormatVersion: TAPE_V_BUDGET,
      risqueReplayLooseTimeline: true,
      savedAt: Date.now(),
      round: gs.round,
      phase: gs.phase != null ? String(gs.phase) : "",
      currentPlayer: gs.currentPlayer != null ? String(gs.currentPlayer) : "",
      sessionKey: gs.risqueReplayTapeSessionKey || null,
      playerColors: mergedColors,
      tape: {
        v: TAPE_V_BUDGET,
        events: events,
        openingRecorded: true,
        hasDealFrames: hasDealFrames
      }
    };
  };
})();
