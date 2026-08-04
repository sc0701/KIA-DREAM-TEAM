const UIController = {
    getOvrTier(ovr) {
        if (ovr >= 93) return 'tier-legend';
        if (ovr >= 87) return 'tier-elite';
        if (ovr >= 81) return 'tier-rare';
        if (ovr >= 75) return 'tier-special';
        return 'tier-normal';
    },

    setBodyTheme(theme) {
        document.body.classList.remove('theme-sim', 'theme-decision');
        if (theme && theme !== 'default') document.body.classList.add(theme);
    },

    switchStage(stage) {
        document.querySelectorAll('.stage-view').forEach(el => el.style.display = 'none');
        const stickyBar = document.getElementById('top-sticky-bar');
        const bottomBar = document.getElementById('floating-bottom-bar');
        if (bottomBar) bottomBar.classList.remove('show');

        if (stage === 'INTRO') {
            this.setBodyTheme('default');
            if (stickyBar) stickyBar.style.display = 'none';
            const introView = document.getElementById('view-intro');
            if (introView) introView.style.display = 'block';
            this.renderIntroView();
        } else if (stage === 'DRAFT') {
            this.setBodyTheme('default');
            if (stickyBar) stickyBar.style.display = 'flex';
            const draftView = document.getElementById('view-draft');
            if (draftView) draftView.style.display = 'block';
            this.renderNavTabs();
            this.renderCurrentTab();
        } else if (stage === 'STADIUM') {
            this.setBodyTheme('default');
            if (stickyBar) stickyBar.style.display = 'flex';
            const stadiumView = document.getElementById('view-stadium');
            if (stadiumView) stadiumView.style.display = 'block';
            this.renderStadiumView(document.getElementById('stadium-container'));
        } else if (stage === 'SIMULATION') {
            this.setBodyTheme('theme-sim');
            if (stickyBar) stickyBar.style.display = 'none';
            const simView = document.getElementById('view-simulation');
            if (simView) simView.style.display = 'block';
            this.renderSimSummaryWithLoading();
        }
    },

    renderIntroView() {
        const container = document.getElementById('intro-container');
        if (!container) return;
        container.innerHTML = `
        <div class="intro-wrap">
            <div class="intro-card">
                <div class="intro-emblem">🐯</div>
                <h1 class="intro-title">KIA Tigers<br>판타지 감독</h1>
                <p class="intro-desc">
                    당신은 오늘부터 KIA 타이거즈의 새로운 감독입니다.<br>
                    100원의 예산으로 최고의 로스터를 꾸리고, 최대 ${GameState.MAX_SEASONS}시즌 동안 팀을 이끌어보세요.<br>
                    성적이 좋으면 구단의 전폭적인 지원을, 부진하면 <strong style="color:#f87171;">경질</strong>을 각오해야 합니다.
                </p>
                <div class="intro-input-wrap">
                    <label for="coach-name-input">감독님의 성함을 알려주세요</label>
                    <input type="text" id="coach-name-input" maxlength="12" placeholder="예: 눕기태" onkeydown="if(event.key==='Enter') window.startCareer();">
                </div>
                <button class="start-season-btn" style="margin-top:18px;" onclick="window.startCareer()">⚾ 감독 부임하기</button>
            </div>
        </div>`;
        setTimeout(() => {
            const el = document.getElementById('coach-name-input');
            if (el) el.focus();
        }, 100);
    },

    generatePlayerCardHtml(p, options = {}) {
        const { isSelectedHere, isUsedElsewhere, onClick, extraBadge,
                priceDiffHtml, actionBtnHtml, isDisabled, isHighlighted } = options;
        const tierClass = this.getOvrTier(p.ovr);
        const tierName  = tierClass.replace('tier-', '').toUpperCase();

        const statsChipsHtml = p.isPitcher
            ? `<span class="stat-chip">제구 ${p.ctrl}</span><span class="stat-chip">구속 ${p.spd}</span><span class="stat-chip">멘탈 ${p.mtl}</span><span class="stat-chip">체력 ${p.stm}</span>`
            : `<span class="stat-chip">컨택 ${p.con}</span><span class="stat-chip">파워 ${p.pow}</span><span class="stat-chip">수비 ${p.def}</span><span class="stat-chip">주루 ${p.spd}</span>`;

        const imagePath = `image/${p.name}.jpg`;
        const highlightStyle = isHighlighted ? ' card-swap-selected' : '';
        const disabledAttr   = (isUsedElsewhere || isDisabled) ? 'style="opacity:0.4; pointer-events:none;"' : '';
        const onClickAttr    = onClick ? `onclick="${onClick}"` : '';
        const nationalClass  = p.isNational ? ' is-national' : '';

        return `<div class="magu-card ${tierClass}${nationalClass}${highlightStyle} ${isSelectedHere ? 'selected' : ''}" ${disabledAttr} ${onClickAttr}>
            ${p.isNational ? `<div class="national-ribbon"><span>KOREA</span></div><div class="national-mark">🇰🇷</div>` : ''}
            <div class="magu-badge-tier">${tierName}</div>
            ${extraBadge
                ? `<div class="magu-tag" style="display:block;">${extraBadge}</div>`
                : (isSelectedHere ? `<div class="magu-tag">✔ 영입완료</div>` : '')}
            <div class="magu-header">
                <span class="magu-ovr">OVR ${p.ovr}</span>
                <span class="magu-price">₩${p.price}</span>
            </div>
            <div class="magu-photo-frame${p.isNational ? ' national-frame' : ''}">
                <img src="${imagePath}" alt="${p.name}" onerror="this.src='https://placehold.co/120x90/1e293b/94a3b8?text=KBO'">
            </div>
            <div class="magu-info">
                <div class="magu-name">${p.name}</div>
                <div class="magu-season">${p.stat}</div>
                <div class="magu-stats-grid">${statsChipsHtml}</div>
                ${priceDiffHtml ? `<div class="card-price-diff">${priceDiffHtml}</div>` : ''}
                ${actionBtnHtml ? `<div class="card-action-wrap">${actionBtnHtml}</div>` : ''}
            </div>
        </div>`;
    },

    renderNavTabs() {
        const navBar = document.getElementById('nav-tabs-bar');
        if (!navBar) return;
        navBar.innerHTML = '';
        if (!GameData.tabDefs) return;
        GameData.tabDefs.forEach(tab => {
            const btn = document.createElement('button');
            btn.className = 'nav-btn' + (tab.key === GameState.currentTab ? ' active' : '');
            let doneMark = '';
            if (tab.type === 'multi') {
                const n = GameState.selections[tab.key] ? GameState.selections[tab.key].length : 0;
                doneMark = (n === tab.max) ? ' ✅' : ` (${n}/${tab.max})`;
            } else if (tab.type === 'single') {
                doneMark = GameState.selections[tab.key] ? ' ✅' : '';
            }
            btn.innerHTML = `${tab.icon} ${tab.label}${doneMark}`;
            btn.onclick = () => {
                GameState.currentTab = tab.key;
                this.renderNavTabs();
                this.renderCurrentTab();
            };
            navBar.appendChild(btn);
        });
    },

    renderCurrentTab() {
        const container = document.getElementById('positions-container');
        if (!container) return;
        const tab = GameData.tabDefs.find(t => t.key === GameState.currentTab);
        if (!tab) return;

        const isMulti = tab.type === 'multi';
        const selectedArr = isMulti
            ? (GameState.selections[tab.key] || [])
            : (GameState.selections[tab.key] ? [GameState.selections[tab.key]] : []);
        const used = GameState.getUsedBaseNames ? GameState.getUsedBaseNames() : new Set();
        const sortedPool = [...tab.pool].sort((a, b) => (b.ovr - a.ovr) || (b.price - a.price));

        const headerRight = isMulti
            ? `선택 ${selectedArr.length} / ${tab.max}`
            : (selectedArr.length ? `선택: ${selectedArr[0].name} (${selectedArr[0].price}원)` : '미선택');

        container.innerHTML = `<h2 class="group-title">${tab.icon} ${tab.label} <span>${headerRight}</span></h2>
            <div class="player-grid">
            ${sortedPool.map(p => {
                const isSelectedHere  = selectedArr.some(sp => sp.name === p.name);
                const isUsedElsewhere = !isSelectedHere && used.has(SimEngine.baseName(p.name));
                return this.generatePlayerCardHtml(p, {
                    isSelectedHere,
                    isUsedElsewhere,
                    onClick: isUsedElsewhere ? null
                        : (isMulti
                            ? `window.toggleMulti('${tab.key}', '${p.name}')`
                            : `window.selectSingle('${tab.key}', '${p.name}')`)
                });
            }).join('')}
            </div>`;
    },

    updateStickyAndBoard() {
        const spent     = GameState.totalSpent ? GameState.totalSpent() : 0;
        const remaining = 100 - spent;

        const selCountEl = document.getElementById('selected-count');
        if (selCountEl) selCountEl.innerText = `${GameState.selectedCount()} / ${GameState.TOTAL_REQUIRED}`;

        const remEl = document.getElementById('remaining-budget');
        if (remEl) {
            remEl.innerText = `${remaining}원`;
            remEl.classList.toggle('over', remaining < 0);
        }

        const earnedEl = document.getElementById('earned-money');
        if (earnedEl) earnedEl.innerText = `${GameState.earnedMoney}원`;

        const allSelected = GameState.getAllSelectedPlayers ? GameState.getAllSelectedPlayers() : [];
        const avgOvr = allSelected.length > 0
            ? (allSelected.reduce((s, p) => s + p.ovr, 0) / allSelected.length).toFixed(1)
            : '0.0';

        let teamAvgEl = document.getElementById('team-avg-ovr');
        if (!teamAvgEl) {
            const infoGroup = document.querySelector('.sticky-top-info');
            if (infoGroup) {
                const div = document.createElement('div');
                div.className = 'info-group';
                div.innerHTML = `<span class="label">팀 평균 OVR</span><span class="val" id="team-avg-ovr" style="color:#facc15;">${avgOvr}</span>`;
                infoGroup.appendChild(div);
            }
        } else {
            teamAvgEl.innerText = avgOvr;
        }

        for (let i = 0; i < 5; i++) {
            const p  = GameState.selections.sp[i];
            const el = document.getElementById(`e-sp${i + 1}`);
            if (el) el.innerHTML = p
                ? this.getStickyMiniHtml(`${i+1}선발`, p)
                : `<span style="color:#64748b; font-size:0.7rem;">- ${i+1}선발 -</span>`;
        }
        for (let i = 0; i < 3; i++) {
            const p  = GameState.selections.rp[i];
            const el = document.getElementById(`e-rp${i + 1}`);
            if (el) el.innerHTML = p
                ? this.getStickyMiniHtml(`중계${i+1}`, p)
                : `<span style="color:#64748b; font-size:0.7rem;">- 중계${i+1} -</span>`;
        }
        const cpEl = document.getElementById('e-cp');
        if (cpEl) cpEl.innerHTML = GameState.selections.cp
            ? this.getStickyMiniHtml('마무리', GameState.selections.cp)
            : `<span style="color:#64748b; font-size:0.7rem;">- 마무리 -</span>`;

        for (let i = 0; i < 9; i++) {
            const key = GameState.battingOrder[i];
            const p   = GameState.selections[key];
            const el  = document.getElementById(`e-b${i + 1}`);
            if (el) el.innerHTML = p
                ? this.getStickyMiniHtml(`${i+1}번(${GameData.POSITION_ABBR[key]})`, p)
                : `<span style="color:#64748b; font-size:0.7rem;">- ${i+1}번 -</span>`;
        }

        let bottomBar = document.getElementById('floating-bottom-bar');
        if (!bottomBar) {
            bottomBar = document.createElement('div');
            bottomBar.id = 'floating-bottom-bar';
            document.body.appendChild(bottomBar);
        }

        const viewDraft = document.getElementById('view-draft');
        if (GameState.selectedCount() === GameState.TOTAL_REQUIRED
            && viewDraft && viewDraft.style.display !== 'none') {
            if (spent <= 100) {
                bottomBar.innerHTML = `
                    <div class="floating-inner success-theme">
                        <div class="floating-text">
                            <strong style="color:#4ade80;">🎉 18명 로스터 완성!</strong> (잔여: ${remaining}원)
                        </div>
                        <button class="pulse-button" onclick="window.goToStadium()">📋 라인업 확정 ➡️</button>
                    </div>`;
            } else {
                bottomBar.innerHTML = `
                    <div class="floating-inner error-theme">
                        <div class="floating-text">
                            <strong>⚠️ 예산 초과 (${spent}원/100원)</strong> — 선수 교체 필요!
                        </div>
                    </div>`;
            }
            setTimeout(() => bottomBar.classList.add('show'), 50);
        } else {
            bottomBar.classList.remove('show');
        }
    },

    moneyBadgeFloatHtml() {
        return `<div class="money-badge money-badge-float">
            <span class="money-badge-icon">💰</span>
            <div class="money-badge-text">
                <span class="money-badge-label">가용 자금</span>
                <span class="money-badge-val">${GameState.earnedMoney}원</span>
            </div>
        </div>`;
    },

    moneyChipHtml(amount) {
        return `<span class="money-chip">💰 ${amount}원</span>`;
    },

    getStickyMiniHtml(posLabel, p) {
        return `<div class="sticky-mini-card">
            <span class="sticky-mini-pos">${posLabel}</span>
            <span class="sticky-mini-name">${p.name}</span>
            <span class="sticky-mini-sub">OVR ${p.ovr} · ₩${p.price}</span>
        </div>`;
    },

    renderStadiumView(container) {
        const complete = GameState.selectedCount() === GameState.TOTAL_REQUIRED;
        if (!complete) {
            container.innerHTML = `<h2 class="group-title">🏟️ 야구장</h2>
                <div class="stadium-locked">
                    <p>⚠️ 아직 로스터가 완성되지 않았습니다. (${GameState.selectedCount()}/${GameState.TOTAL_REQUIRED})</p>
                    <p>모든 포지션을 먼저 채워주세요.</p>
                </div>`;
            return;
        }

        const sel = GameState.selectedCardForSwap;

        const makeSwapClick = (group, type, idx) => {
            if (!sel) return `window.stadiumCardClick('${group}', '${type}', ${idx === undefined ? 'null' : idx})`;
            if (sel.group === group) return `window.stadiumCardSwap('${group}', '${type}', ${idx === undefined ? 'null' : idx})`;
            return `window.stadiumCardClick('${group}', '${type}', ${idx === undefined ? 'null' : idx})`;
        };

        const isCardSelected = (group, type, idx) => {
            if (!sel) return false;
            return sel.group === group && sel.type === type && sel.idx === idx;
        };

        let html = `<h2 class="group-title">📋 라인업 편성
            <span style="font-size:0.75rem; color:#94a3b8; font-weight:normal;">
                ${sel ? `✋ <strong style="color:#facc15;">${sel.name}</strong> 선택됨 — 교체할 카드를 클릭하세요` : '카드를 클릭하여 순서를 바꿔보세요'}
            </span>
        </h2>`;

        if (sel) {
            html += `<div class="swap-hint-bar">
                <span>✋ <strong>${sel.name}</strong> 선택됨</span>
                <button class="action-btn" onclick="window.stadiumCancelSwap()">❌ 선택 취소</button>
            </div>`;
        }

        // 투수진
        html += `<div class="lineup-panel" style="margin-bottom:20px;">
            <h3 style="color:#facc15; margin-bottom:10px;">⚾ 투수진 — <small style="color:#94a3b8; font-weight:normal;">클릭으로 로테이션 순서 변경</small></h3>
            <div class="player-grid">`;
        GameState.selections.sp.forEach((p, i) => {
            const highlighted = isCardSelected('pitcher', 'sp', i);
            html += this.generatePlayerCardHtml(p, {
                extraBadge: `${i+1}선발`, isHighlighted: highlighted, onClick: makeSwapClick('pitcher', 'sp', i)
            });
        });
        GameState.selections.rp.forEach((p, i) => {
            const highlighted = isCardSelected('pitcher', 'rp', i);
            html += this.generatePlayerCardHtml(p, {
                extraBadge: `중계${i+1}`, isHighlighted: highlighted, onClick: makeSwapClick('pitcher', 'rp', i)
            });
        });
        html += this.generatePlayerCardHtml(GameState.selections.cp, { extraBadge: `마무리` });
        html += `</div></div>`;

        // 타자진
        html += `<div class="lineup-panel" style="margin-bottom:20px;">
            <h3 style="color:#facc15; margin-bottom:10px;">🏏 타자진 — <small style="color:#94a3b8; font-weight:normal;">클릭으로 타순 변경</small></h3>
            <div class="player-grid">`;
        GameState.battingOrder.forEach((key, i) => {
            const p = GameState.selections[key];
            const highlighted = isCardSelected('batter', key, i);
            html += this.generatePlayerCardHtml(p, {
                extraBadge: `${i+1}번 ${GameData.POSITION_ABBR[key]}`, isHighlighted: highlighted, onClick: makeSwapClick('batter', key, i)
            });
        });
        html += `</div></div>`;

        html += `<button class="start-season-btn" onclick="window.startSim()">🏆 라인업 확정 & 시즌 시작</button>`;
        container.innerHTML = html;
    },

  showEventModal(event, onComplete) {
        window._currentEventObj = event;
        const simArea = document.getElementById('view-simulation');
        if (!simArea) { onComplete(); return; }

        const imgPath = `image/${event.imgPlaceholder}.jpg`;

        simArea.innerHTML = `
        <div class="event-modal-wrap">
            <div class="event-card">
                <div class="event-card-header">
                    <span class="event-flash">📢 시즌 이벤트 발생!</span>
                    <h3 class="event-title">${event.title}</h3>
                </div>
                <div class="event-img-frame">
                    <img src="${imgPath}" alt="${event.title}" onerror="this.src='https://placehold.co/600x280/1e293b/94a3b8?text=Event+Illustration'">
                </div>
                <p class="event-desc">${event.desc}</p>
                <div class="event-choice-list">
                    ${event.choices.map((c, i) => {
                        const canAfford = c.cost <= GameState.earnedMoney;
                        return `<button class="event-choice-btn" ${canAfford ? '' : 'disabled'} onclick="window.chooseEventOption(${i})">
                            <span class="event-choice-label">${c.label}</span>
                            ${!canAfford ? `<span class="event-choice-warn">💰 적립금 부족 (보유 ${GameState.earnedMoney}원)</span>` : ''}
                        </button>`;
                    }).join('')}
                </div>
                <p class="event-money-note">💰 현재 가용 자금: <strong style="color:#4ade80;">${GameState.earnedMoney}원</strong> ${GameState.loanBalance > 0 ? `(대출 잔액: <span style="color:#f87171;">${GameState.loanBalance}원</span>)` : ''}</p>
            </div>
        </div>`;

        window.chooseEventOption = (idx) => {
            const c = event.choices[idx];
            if (c.cost > GameState.earnedMoney) {
                // 대출 안내 및 처리
                if (confirm(`가용 자금이 부족합니다. 대출을 받아 진행하시겠습니까? (20% 이자 부과)`)) {
                    SimEngine.processLoan(c.cost);
                } else {
                    return;
                }
            }
            const result = SimEngine.resolveEvent(event, idx);
            if (!result || result.error) {
                alert(result ? result.error : '오류가 발생했습니다.');
                return;
            }
            this.renderEventResult(event, result, onComplete);
        };
    },

    // 🌟 1. 시즌 종료 후 전지훈련 전 [FA 선언 및 선수단 정리 단계] 진입
    renderSeasonDecisionView(simArea, finalStandings, finalRank, myFinalRecord, outcome) {
        const flavor = this._getSeasonRankFlavor(finalRank);
        const coach = GameState.coachName ? `${GameState.coachName} 감독님` : '감독님';

        simArea.innerHTML = `
        <div class="decision-card">
            ${this.moneyBadgeFloatHtml()}
            <div class="ending-header">
                <div class="decision-eyebrow">시즌 ${GameState.seasonNumber} 종료</div>
                <div class="ending-title">${flavor.title}</div>
                <div class="ending-desc">${flavor.desc}</div>
            </div>

            <div class="ending-section outcome-section outcome-${outcome.tier.toLowerCase()}">
                <div class="ending-section-title">${outcome.label}</div>
                <p style="font-size:0.88rem; color:#e2e8f0; line-height:1.5;">${coach}, ${outcome.msg}</p>
                ${outcome.bonus > 0 ? `<div class="bonus-tag">${this.moneyChipHtml('+' + outcome.bonus)} 추가 지원!</div>` : ''}
            </div>

            <div class="ending-section">
                <div class="ending-section-title">📈 시즌 ${GameState.seasonNumber} 최종 결산</div>
                <div class="ending-stat-grid">
                    <div class="ending-stat-item"><span>최종 순위</span><strong style="color:#facc15;">${finalRank}위</strong></div>
                    <div class="ending-stat-item"><span>전적</span><strong>${myFinalRecord ? myFinalRecord.wins : 0}승 ${myFinalRecord ? myFinalRecord.losses : 0}패</strong></div>
                    <div class="ending-stat-item"><span>보유 자금</span><strong style="color:#4ade80;">${GameState.earnedMoney}원</strong></div>
                    <div class="ending-stat-item"><span>다음 단계</span><strong style="color:#facc15;">FA 시장 개설 & 선수단 정리</strong></div>
                </div>
            </div>

            <button class="start-season-btn decision-continue-btn" onclick="UIController.startFaPhase()">⚖️ FA 시장 및 선수단 정산 시작하기</button>
        </div>`;
    },

    // 🌟 FA 시스템 UI 화면 (3~4명 무작위 선정, 재계약 비용 1.5~2배 혹은 포기 시 원금-2원 반환)
    startFaPhase() {
        const allPlayers = GameState.getAllSelectedPlayers();
        // 무작위로 3~4명의 FA 선발 (선수단이 4명 미만이면 전원)
        const faCount = Math.min(allPlayers.length, Math.floor(Math.random() * 2) + 3);
        const shuffled = [...allPlayers].sort(() => 0.5 - Math.random());
        
        GameState.faCandidates = shuffled.slice(0, faCount).map(p => {
            const multiplier = 1.5 + Math.random() * 0.5; // 1.5배 ~ 2배
            const demandPrice = Math.round(p.price * multiplier);
            return { player: p, demandPrice, originalPrice: p.price };
        });

        this.renderFaScreen();
    },

    renderFaScreen() {
        const simArea = document.getElementById('view-simulation');
        if (!simArea) return;

        simArea.innerHTML = `
        <div class="decision-card">
            ${this.moneyBadgeFloatHtml()}
            <div class="ending-header">
                <div class="decision-eyebrow">⚖️ 스토브리그 FA(자유계약) 선언</div>
                <div class="ending-title">시즌 종료 후 FA 자격을 취득한 선수들입니다</div>
                <div class="ending-desc">선수들이 높은 연봉(원래 가격의 1.5~2배)을 요구합니다. 재계약을 하거나, FA를 포기시키고 팀을 떠나게 만들 수 있습니다.</div>
            </div>

            <div class="ending-section">
                <div class="ending-section-title">📝 FA 대상 선수 명단</div>
                <div class="player-grid" style="margin-top:12px;">
                    ${GameState.faCandidates.map((fa, index) => {
                        const canAfford = fa.demandPrice <= GameState.earnedMoney;
                        return `
                        <div class="magu-card tier-rare selected" style="padding:15px;">
                            <div class="magu-name">${fa.player.name}</div>
                            <div class="magu-season">원래 연봉: ₩${fa.originalPrice}</div>
                            <div style="color:#facc15; font-weight:bold; margin:8px 0;">요구 연봉: ₩${fa.demandPrice}</div>
                            <div style="display:flex; gap:6px; margin-top:10px;">
                                <button class="action-btn" style="flex:1; background:${canAfford ? '#2563eb' : '#475569'};" onclick="UIController.acceptFa(${index})">재계약</button>
                                <button class="action-btn" style="flex:1; background:#dc2626;" onclick="UIController.rejectFa(${index})">FA 포기(방출)</button>
                            </div>
                        </div>`;
                    }).join('')}
                </div>
            </div>

            <button class="start-season-btn" style="margin-top:20px;" onclick="UIController.finishFaPhase()">🏕️ 선수단 정리 완료 후 전지훈련으로 이동 ➡️</button>
        </div>`;
    },

    acceptFa(idx) {
        const fa = GameState.faCandidates[idx];
        if (!fa) return;

        if (fa.demandPrice > GameState.earnedMoney) {
            if (confirm(`연봉이 부족합니다. 대출을 받아 재계약을 체결하시겠습니까? (20% 이자 부과)`)) {
                SimEngine.processLoan(fa.demandPrice);
            } else {
                return;
            }
        }

        GameState.earnedMoney -= fa.demandPrice;
        fa.player.price = fa.demandPrice; // 가격 갱신
        GameState.faCandidates.splice(idx, 1);
        alert(`${fa.player.name} 선수가 재계약에 성공했습니다!`);
        this.renderFaScreen();
    },

    rejectFa(idx) {
        const fa = GameState.faCandidates[idx];
        if (!fa) return;

        // 팀을 떠날 때 본래 가격에서 2원을 제외한 돈을 팀에 주고 감 (최소 0원)
        const refund = Math.max(0, fa.originalPrice - 2);
        GameState.earnedMoney += refund;

        // 로스터에서 해당 선수 제거
        this.removePlayerFromRoster(fa.player);
        GameState.faCandidates.splice(idx, 1);
        alert(`${fa.player.name} 선수가 FA로 팀을 떠났습니다. 보상금 ₩${refund}이 팀에 입금되었습니다.`);
        this.renderFaScreen();
    },

    removePlayerFromRoster(player) {
        if (GameState.selections.sp.includes(player)) {
            GameState.selections.sp = GameState.selections.sp.filter(p => p !== player);
        } else if (GameState.selections.rp.includes(player)) {
            GameState.selections.rp = GameState.selections.rp.filter(p => p !== player);
        } else if (GameState.selections.cp === player) {
            GameState.selections.cp = null;
        } else {
            Object.keys(GameData.POSITION_LABEL).forEach(k => {
                if (GameState.selections[k] === player) GameState.selections[k] = null;
            });
        }
    },

    finishFaPhase() {
        if (GameState.faCandidates.length > 0) {
            if (!confirm("아직 처리하지 않은 FA 선수가 있습니다. 그래도 넘어가시겠습니까? (남은 선수는 자동 방출 처리됩니다)")) return;
            GameState.faCandidates.forEach(fa => {
                const refund = Math.max(0, fa.originalPrice - 2);
                GameState.earnedMoney += refund;
                this.removePlayerFromRoster(fa.player);
            });
        }
        window.prepareNextSeason(); 
    },

    renderEventResult(event, result, onComplete) {
        const simArea = document.getElementById('view-simulation');
        if (!simArea) { onComplete(); return; }

        simArea.innerHTML = `
        <div class="event-modal-wrap">
            <div class="event-card ${result.isGood ? 'event-result-good' : 'event-result-bad'}">
                <div class="event-card-header">
                    <span class="event-flash">${result.isGood ? '✨ 결과: 대성공!' : '💧 결과: 아쉬운 결과'}</span>
                    <h3 class="event-title">${event.title}</h3>
                </div>
                <p class="event-result-msg">${result.msg}</p>
                <p class="event-result-effect" style="color:${result.effect >= 0 ? '#4ade80' : '#f87171'};">
                    팀 승률 ${result.effect >= 0 ? '+' : ''}${(result.effect * 100).toFixed(1)}%p 반영됨 
                </p>
                <button class="start-season-btn" onclick="window.continueAfterEvent()">계속하기 ➡️</button>
            </div>
        </div>`;

        window.continueAfterEvent = () => onComplete();
    },

    renderSimSummaryWithLoading() {
        const simArea = document.getElementById('view-simulation');
        if (!simArea) return;
        simArea.innerHTML = `
            <div class="loading-overlay">
                <div class="spinner"></div>
                <h3 style="color:#38bdf8; margin-bottom:6px;">시뮬레이션 구동 중...</h3>
                <p style="color:#94a3b8; font-size:0.8rem;">투타 밸런스, 시너지, 리그 순위를 연산하고 있습니다.</p>
            </div>`;
        setTimeout(() => this.renderSimSummary(), 1200);
    },

    renderSimSummary() {
        const step = GameData.seasonSteps[GameState.currentStepIndex];
        const simArea = document.getElementById('view-simulation');
        if (!simArea) return;

        if (GameState.currentStepIndex >= GameData.seasonSteps.length - 1) {
            this.renderSeasonEndView(simArea);
            return;
        }

        const { coachMsg, myRank, myPower } = SimEngine.getNewsAndReportForCurrentStep();
        const standings = SimEngine.getLeagueStandings(step.games);
        const myRecord  = standings.find(t => t.isMy);

        const progressPct = Math.round((step.games / 144) * 100);
        const stepLabels  = ['1구간 (36경기)', '2구간 (72경기)', '3구간 (108경기)', '최종전 (144경기)'];
        const stepLabel   = stepLabels[GameState.currentStepIndex] || '';

        const rankEmoji = myRank === 1 ? '🥇' : myRank <= 3 ? '🥈' : myRank <= 5 ? '🥉' : '📊';
        const rankColor = myRank === 1 ? '#facc15' : myRank <= 3 ? '#c0c0c0' : myRank <= 5 ? '#cd7f32' : '#94a3b8';

        const synergyBadgesHtml = myPower.synergyDetails && myPower.synergyDetails.length > 0
            ? myPower.synergyDetails.map(s =>
                `<span class="synergy-badge" style="background:${s.color}22; border:1px solid ${s.color}; color:${s.color};"
                    title="${s.desc}">${s.tag}</span>`
              ).join('')
            : `<span class="synergy-badge" style="background:#1e293b; border:1px solid #475569; color:#94a3b8;">시너지 없음</span>`;

        const standingsHtml = standings.map(t => {
            const rEmoji = t.rank === 1 ? '🥇' : t.rank <= 3 ? '🥈' : t.rank <= 5 ? '🥉' : `${t.rank}`;
            const rowBg  = t.isMy
                ? 'background:linear-gradient(90deg,rgba(56,189,248,0.15),rgba(56,189,248,0.05)); border-left:3px solid #38bdf8;'
                : 'background:#1e293b;';
            const teamColor = t.isMy ? '#38bdf8' : '#e2e8f0';
            return `<div class="standings-row" style="${rowBg}">
                <span class="standings-rank">${rEmoji}</span>
                <span class="standings-name" style="color:${teamColor};">${t.name}</span>
                <span class="standings-wl">
                    <span style="color:#4ade80;">${t.wins}승</span>
                    <span style="color:#f87171;">${t.losses}패</span>
                    <span style="color:#94a3b8;">${t.winRate}</span>
                </span>
            </div>`;
        }).join('');

        simArea.innerHTML = `
        <div class="sim-dashboard">
            ${this.moneyBadgeFloatHtml()}
            <div class="sim-header-banner">
                <div class="sim-header-season">시즌 ${GameState.seasonNumber} / ${GameState.MAX_SEASONS}${GameState.coachName ? ` · ${GameState.coachName} 감독` : ''}</div>
                <div class="sim-header-title">🏆 KIA 타이거즈 시즌 리포트</div>
                <div class="sim-header-step">${stepLabel}</div>
                <div class="sim-progress-wrap">
                    <div class="sim-progress-bar" style="width:${progressPct}%"></div>
                </div>
                <div class="sim-progress-label">${step.games} / 144 경기 완료</div>
            </div>

            <div class="sim-rank-card">
                <div class="sim-rank-emoji">${rankEmoji}</div>
                <div class="sim-rank-main">
                    <div class="sim-rank-num" style="color:${rankColor};">${myRank}위</div>
                    <div class="sim-rank-record">
                        <span style="color:#4ade80;">${myRecord ? myRecord.wins : 0}승</span>
                        <span style="color:#f87171;">${myRecord ? myRecord.losses : 0}패</span>
                        <span style="color:#94a3b8;">승률 ${myRecord ? myRecord.winRate : '.000'}</span>
                    </div>
                    ${GameState.eventWinRateBonus
                        ? `<div class="event-bonus-tag" style="color:${GameState.eventWinRateBonus >= 0 ? '#4ade80' : '#f87171'};">
                            🎤 이벤트 누적 효과 ${GameState.eventWinRateBonus >= 0 ? '+' : ''}${(GameState.eventWinRateBonus * 100).toFixed(1)}%p
                           </div>`
                        : ''}
                </div>
                <div class="sim-rank-power">
                    <div class="sim-power-bar-wrap" style="display: flex; align-items: center;">
                        <span style="width: 40px;">타격</span>
                        <div class="sim-power-bar" style="flex:1; margin:0 8px;"><div style="width:${Math.min(100,(myPower.batting/100)*100).toFixed(0)}%; background:#facc15;"></div></div>
                        <span style="width: 35px; text-align: right; font-weight:bold; color:#facc15;">${myPower.batting.toFixed(1)}</span>
                    </div>
                    <div class="sim-power-bar-wrap" style="display: flex; align-items: center;">
                        <span style="width: 40px;">투수</span>
                        <div class="sim-power-bar" style="flex:1; margin:0 8px;"><div style="width:${Math.min(100,(myPower.pitching/100)*100).toFixed(0)}%; background:#38bdf8;"></div></div>
                        <span style="width: 35px; text-align: right; font-weight:bold; color:#38bdf8;">${myPower.pitching.toFixed(1)}</span>
                    </div>
                    <div class="sim-power-bar-wrap" style="display: flex; align-items: center;">
                        <span style="width: 40px;">수비</span>
                        <div class="sim-power-bar" style="flex:1; margin:0 8px;"><div style="width:${Math.min(100,(myPower.defense/100)*100).toFixed(0)}%; background:#4ade80;"></div></div>
                        <span style="width: 35px; text-align: right; font-weight:bold; color:#4ade80;">${myPower.defense.toFixed(1)}</span>
                    </div>
                </div>
            </div>

            <div class="sim-section">
                <div class="sim-section-title">⚡ 팀 특색 시너지</div>
                <div class="synergy-badge-wrap">${synergyBadgesHtml}</div>
                ${myPower.synergyDetails && myPower.synergyDetails.length > 0
                    ? `<div class="synergy-detail-list">${myPower.synergyDetails.map(s =>
                        `<div class="synergy-detail-row" style="border-left:3px solid ${s.color};">
                            <span style="color:${s.color};">${s.tag}</span>
                            <span class="synergy-detail-desc">${s.desc}</span>
                        </div>`).join('')}</div>`
                    : ''}
            </div>

            <div class="sim-section">
                <div class="sim-section-title">📋 수석코치 리포트</div>
                <div class="coach-bubble">
                    <div class="coach-avatar">👨‍💼</div>
                    <div class="coach-text">
                        <p>${coachMsg}</p>
                        ${step._earnedThisStep
                            ? `<p class="coach-earn">💰 이번 구간 수익: <strong>+${step._earnedThisStep}원</strong> 적립! (총 가용 자금: <strong style="color:#4ade80;">${GameState.earnedMoney}원</strong>)</p>`
                            : ''}
                    </div>
                </div>
            </div>

            <div class="sim-section">
                <div class="sim-section-title">📊 KBO 리그 순위</div>
                <div class="standings-list">${standingsHtml}</div>
            </div>

            <div class="sim-action-btns">
                <button class="sim-btn sim-btn-swap" onclick="UIController.renderSimDetail('stats')">
                    🔄 선수 성적 확인 & 교체
                    <small>부진한 선수를 내치고 새로운 선수를 영입</small>
                </button>
                <button class="sim-btn sim-btn-next" onclick="window.nextSeasonStep()">
                    ⏩ 다음 구간 진행
                    <small>시즌을 계속합니다</small>
                </button>
            </div>
        </div>`;
    },

    _getSeasonRankFlavor(finalRank) {
        const table = {
            1: { title: '🎉 통합 우승! (V14) 🎉', desc: '완벽한 투타 밸런스와 견고한 수비력으로 한국시리즈를 완벽하게 석권했습니다!' },
            2: { title: '🥈 한국시리즈 준우승', desc: '아쉽게 정상 문턱에서 고배를 마셨지만, 눈부신 승부를 펼쳤습니다!' },
            3: { title: '🥉 플레이오프 진출 (3위)', desc: '끝까지 치열한 상위권 싸움을 벌이며 강팀의 품격을 증명했습니다.' },
            4: { title: '🔥 준플레이오프 진출 (4위)', desc: '끈질긴 승부 끝에 가을야구 막차를 타며 저력을 보여주었습니다.' },
            5: { title: '⚾ 와일드카드 결정전 진출 (5위)', desc: '마지막까지 한 치의 양보 없는 순위 싸움 끝에 가을야구 티켓을 거머쥐었습니다!' },
            6: { title: '📌 아쉬운 가을야구 탈락 (6위)', desc: '단 한 끗 차이로 5위 자리를 놓치며 뼈아픈 가을야구 좌절을 맛보았습니다.' },
            7: { title: '📉 중하위권 마감 (7위)', desc: '시즌 중반 부침을 이겨내지 못하고 아쉬운 순위로 대회를 마감합니다.' },
            8: { title: '⚠️ 부진 속 마감 (8위)', desc: '투타 밸런스가 무너지며 팬들에게 아쉬움을 남긴 시즌이 되었습니다.' },
            9: { title: '⛈️ 하위권 추락 (9위)', desc: '잦은 부상과 전력 누수를 극복하지 못하고 깊은 부진에 빠졌습니다.' },
            10:{ title: '🌪️ 최하위 마감 (10위)', desc: '뼈아픈 연패와 실책의 연쇄 작용 속에서 혹독한 최하위의 아픔을 겪었습니다.' }
        };
        return table[finalRank] || table[10];
    },

    _buildStandingsTableHtml(standings) {
        return `<div class="table-responsive-wrap">
            <table class="roster-stat-table">
                <tr><th>순위</th><th style="text-align:left;">팀명</th><th>승</th><th>패</th><th>승률</th></tr>
                ${standings.map(t => `
                <tr style="${t.isMy ? 'background:rgba(56,189,248,0.12); font-weight:bold;' : ''}">
                    <td style="color:${t.rank===1?'#facc15':'#fff'};">${t.rank}위</td>
                    <td style="text-align:left; color:${t.isMy?'#38bdf8':'#f8fafc'};">${t.name}</td>
                    <td style="color:#4ade80;">${t.wins}</td>
                    <td style="color:#f87171;">${t.losses}</td>
                    <td style="color:#facc15;">${t.winRate}</td>
                </tr>`).join('')}
            </table>
        </div>`;
    },

    _buildRosterStatTableHtml() {
        const finalRows = [];
        if (GameState.selections.sp) GameState.selections.sp.forEach((p, i) => finalRows.push({ label: `${i+1}선발`, type: 'sp', idx: i, player: p }));
        if (GameState.selections.rp) GameState.selections.rp.forEach((p, i) => finalRows.push({ label: `중간계투${i+1}`, type: 'rp', idx: i, player: p }));
        if (GameState.selections.cp) finalRows.push({ label: '마무리', type: 'cp', idx: undefined, player: GameState.selections.cp });
        if (GameState.battingOrder)  GameState.battingOrder.forEach((key, i) => finalRows.push({ label: `${i+1}번(${GameData.POSITION_ABBR[key]})`, type: key, idx: undefined, player: GameState.selections[key] }));
        finalRows.forEach(row => { row.history = (GameState.historyLogs || []).filter(h => h.type === row.type && h.idx === row.idx); });

        const finalStep = GameData.seasonSteps[GameData.seasonSteps.length - 1];

        return `<div class="table-responsive-wrap">
            <table class="roster-stat-table">
                <tr><th>슬롯</th><th style="text-align:left;">선수명</th><th style="text-align:left;">성적</th><th>등급</th></tr>
                ${finalRows.map(row => {
                    const st = SimEngine.computeStatFor(row.type, row.idx, finalStep);
                    let rowHtml = `<tr style="background:rgba(34,197,94,0.08);">
                        <td style="color:#cbd5e1; font-weight:bold;">${row.label}</td>
                        <td style="text-align:left; color:#f8fafc;">${row.player.name} <span style="font-size:0.7rem; color:#4ade80;">(최종)</span></td>
                        <td style="text-align:left; color:#38bdf8; font-family:monospace; font-size:0.78rem;">${st.line}</td>
                        <td><span class="grade-badge grade-${st.grade}">${st.grade}</span></td>
                    </tr>`;
                    if (row.history && row.history.length > 0) {
                        row.history.forEach(h => {
                            rowHtml += `<tr style="opacity:0.65; border-bottom:1px dashed #334155;">
                                <td style="color:#64748b; font-size:0.75rem;">↪ 전임</td>
                                <td style="text-align:left; color:#94a3b8;"><strike>${h.player.name}</strike> <span style="font-size:0.65rem; color:#f87171;">(${h.leftStep+1}구간 아웃)</span></td>
                                <td style="text-align:left; color:#64748b; font-family:monospace; font-size:0.73rem;">${h.statLine}</td>
                                <td><span class="grade-badge grade-${h.statGrade}" style="opacity:0.6;">${h.statGrade}</span></td>
                            </tr>`;
                        });
                    }
                    return rowHtml;
                }).join('')}
            </table>
        </div>`;
    },

    _buildEventLogSectionHtml() {
        if (!GameState.eventLogs || GameState.eventLogs.length === 0) return '';
        return `<div class="ending-section">
            <div class="ending-section-title">📻 시즌 중 주요 결정</div>
            <div class="event-log-list">
                ${GameState.eventLogs.map(log => `
                    <div class="event-log-row" style="border-left:3px solid ${log.isGood ? '#4ade80' : '#f87171'};">
                        <div class="event-log-title">${log.title}</div>
                        <div class="event-log-choice">${log.choiceLabel}</div>
                        <div class="event-log-outcome" style="color:${log.isGood ? '#4ade80' : '#f87171'};">${log.msg}</div>
                    </div>
                `).join('')}
            </div>
        </div>`;
    },

    _buildCareerLogTableHtml() {
        if (!GameState.careerLog || GameState.careerLog.length === 0) return '';
        return `<div class="table-responsive-wrap">
            <table class="roster-stat-table">
                <tr><th>시즌</th><th>순위</th><th>전적</th><th>결과</th></tr>
                ${GameState.careerLog.map(l => `
                <tr>
                    <td>시즌 ${l.season}</td>
                    <td style="color:${l.rank===1?'#facc15':'#fff'};">${l.rank}위</td>
                    <td>${l.wins}승 ${l.losses}패</td>
                    <td style="color:${l.fired ? '#f87171' : (l.bonus > 0 ? '#4ade80' : '#94a3b8')};">${l.fired ? '경질' : (l.bonus > 0 ? `+${l.bonus}원 지원` : '유임')}</td>
                </tr>`).join('')}
            </table>
        </div>`;
    },

    /**
     * 🌟 시즌 종료 시 호출되는 진입점 — 순위를 판정하고 경질/유임/커리어 완주 여부에 따라 분기한다.
     */
    renderSeasonEndView(simArea) {
        const finalStandings = SimEngine.getLeagueStandings(144);
        const myFinalRecord  = finalStandings.find(t => t.isMy);
        const finalRank      = myFinalRecord ? myFinalRecord.rank : 1;

        // 이번 시즌 결과가 아직 커리어 기록에 반영되지 않았다면 1회만 반영한다.
        let logEntry = GameState.careerLog.find(l => l.season === GameState.seasonNumber);
        const outcome = SimEngine.getSeasonOutcome(finalRank);
  if (!logEntry) {
            logEntry = {
                season: GameState.seasonNumber, rank: finalRank,
                wins: myFinalRecord ? myFinalRecord.wins : 0,
                losses: myFinalRecord ? myFinalRecord.losses : 0,
                bonus: outcome.bonus, tier: outcome.tier, fired: outcome.fired
            };
            GameState.careerLog.push(logEntry);
            if (!outcome.fired) {
                GameState.earnedMoney += outcome.bonus;
                
                if (finalRank === 1) {
                    GameState.totalChampionships = (GameState.totalChampionships || 12) + 1;
                }
            }
        }

        this.setBodyTheme('theme-decision');

        if (outcome.fired) {
            this.renderFiredView(simArea, finalStandings, finalRank, myFinalRecord, outcome);
        } else if (GameState.seasonNumber >= GameState.MAX_SEASONS) {
            this.renderCareerCompleteView(simArea, finalStandings, finalRank, myFinalRecord, outcome);
        } else {
            this.renderSeasonDecisionView(simArea, finalStandings, finalRank, myFinalRecord, outcome);
        }
    },

    renderSeasonDecisionView(simArea, finalStandings, finalRank, myFinalRecord, outcome) {
        const flavor = this._getSeasonRankFlavor(finalRank);
        const coach  = GameState.coachName ? `${GameState.coachName} 감독님` : '감독님';

        simArea.innerHTML = `
        <div class="decision-card">
            ${this.moneyBadgeFloatHtml()}
            <div class="ending-header">
                <div class="decision-eyebrow">시즌 ${GameState.seasonNumber} 종료</div>
                <div class="ending-title">${flavor.title}</div>
                <div class="ending-desc">${flavor.desc}</div>
            </div>

            <div class="ending-section outcome-section outcome-${outcome.tier.toLowerCase()}">
                <div class="ending-section-title">${outcome.label}</div>
                <p style="font-size:0.88rem; color:#e2e8f0; line-height:1.5;">${coach}, ${outcome.msg}</p>
                ${outcome.bonus > 0 ? `<div class="bonus-tag">${this.moneyChipHtml('+' + outcome.bonus)} 추가 지원!</div>` : ''}
            </div>

            <div class="ending-section">
                <div class="ending-section-title">📈 시즌 ${GameState.seasonNumber} 최종 결산</div>
                <div class="ending-stat-grid">
                    <div class="ending-stat-item"><span>최종 순위</span><strong style="color:#facc15;">${finalRank}위</strong></div>
                    <div class="ending-stat-item"><span>전적</span><strong>${myFinalRecord ? myFinalRecord.wins : 0}승 ${myFinalRecord ? myFinalRecord.losses : 0}패</strong></div>
                    <div class="ending-stat-item"><span>보유 자금</span><strong style="color:#4ade80;">${GameState.earnedMoney}원</strong></div>
                    <div class="ending-stat-item"><span>다음 시즌</span><strong style="color:#facc15;">시즌 ${GameState.seasonNumber + 1} / ${GameState.MAX_SEASONS}</strong></div>
                </div>
            </div>

            <div class="ending-section">
                <div class="ending-section-title">📊 최종 리그 순위표</div>
                ${this._buildStandingsTableHtml(finalStandings)}
            </div>

            ${this._buildEventLogSectionHtml()}

            <div class="ending-section">
                <div class="ending-section-title">🧢 선수단 시즌 성적 (교체이력 포함)</div>
                ${this._buildRosterStatTableHtml()}
            </div>

            <button class="start-season-btn decision-continue-btn" onclick="window.prepareNextSeason()">🏕️ 다음 시즌 준비하기 (전지훈련)</button>
        </div>`;
    },

    renderCareerCompleteView(simArea, finalStandings, finalRank, myFinalRecord, outcome) {
        const flavor = this._getSeasonRankFlavor(finalRank);
        const careerGrade = SimEngine.getCareerGrade(GameState.careerLog);
        const coach = GameState.coachName ? `${GameState.coachName} 감독` : '감독';

        simArea.innerHTML = `
        <div class="decision-card career-complete">
            <div class="ending-header">
                <div class="decision-eyebrow">🏁 ${GameState.MAX_SEASONS}시즌 커리어 완주!</div>
                <div class="ending-title">${flavor.title}</div>
                <div class="ending-desc">${flavor.desc}</div>
            </div>

            <div class="ending-section career-grade-section">
                <div class="ending-section-title">🏆 ${coach} 커리어 최종 평가</div>
                <div class="career-grade-badge">${careerGrade.grade}</div>
                <div class="career-grade-avg">${GameState.MAX_SEASONS}시즌 평균 순위 <strong>${careerGrade.avgRank.toFixed(1)}위</strong></div>
                <p style="font-size:0.9rem; color:#e2e8f0; line-height:1.6; margin-top:10px;">${careerGrade.comment}</p>
            </div>

            <div class="ending-section">
                <div class="ending-section-title">📖 시즌별 커리어 기록</div>
                ${this._buildCareerLogTableHtml()}
            </div>

            <div class="ending-section">
                <div class="ending-section-title">📈 마지막 시즌(시즌 ${GameState.seasonNumber}) 결산</div>
                <div class="ending-stat-grid">
                    <div class="ending-stat-item"><span>최종 순위</span><strong style="color:#facc15;">${finalRank}위</strong></div>
                    <div class="ending-stat-item"><span>전적</span><strong>${myFinalRecord ? myFinalRecord.wins : 0}승 ${myFinalRecord ? myFinalRecord.losses : 0}패</strong></div>
                    <div class="ending-stat-item"><span>최종 보유 자금</span><strong style="color:#4ade80;">${GameState.earnedMoney}원</strong></div>
                    <div class="ending-stat-item"><span>구단 평가</span><strong style="color:#facc15;">${careerGrade.grade}</strong></div>
                </div>
            </div>

            <div class="ending-section">
                <div class="ending-section-title">📊 마지막 시즌 최종 순위표</div>
                ${this._buildStandingsTableHtml(finalStandings)}
            </div>

            <div class="ending-section">
                <div class="ending-section-title">🧢 마지막 시즌 선수단 성적</div>
                ${this._buildRosterStatTableHtml()}
            </div>

            <button class="start-season-btn" style="margin-top:24px;" onclick="window.restartCareer()">🔄 새로운 감독으로 다시 시작하기</button>
        </div>`;
    },

    renderFiredView(simArea, finalStandings, finalRank, myFinalRecord, outcome) {
        const careerGrade = SimEngine.getCareerGrade(GameState.careerLog);
        const coach = GameState.coachName ? `${GameState.coachName} 감독` : '감독';

        simArea.innerHTML = `
        <div class="decision-card fired-card">
            <div class="ending-header">
                <div class="decision-eyebrow">💥 감독 경질</div>
                <div class="ending-title">${coach}, 시즌 ${GameState.seasonNumber} 만에 팀을 떠나게 되었습니다</div>
                <div class="ending-desc">${outcome.msg}</div>
            </div>

            <div class="ending-section career-grade-section fired-grade-section">
                <div class="ending-section-title">📉 최종 커리어 평가</div>
                <div class="career-grade-badge">${careerGrade.grade}</div>
                <div class="career-grade-avg">총 ${GameState.careerLog.length}시즌 평균 순위 <strong>${careerGrade.avgRank.toFixed(1)}위</strong></div>
                <p style="font-size:0.9rem; color:#e2e8f0; line-height:1.6; margin-top:10px;">${careerGrade.comment}</p>
            </div>

            <div class="ending-section">
                <div class="ending-section-title">📖 시즌별 커리어 기록</div>
                ${this._buildCareerLogTableHtml()}
            </div>

            <div class="ending-section">
                <div class="ending-section-title">📊 마지막 시즌 최종 순위표</div>
                ${this._buildStandingsTableHtml(finalStandings)}
            </div>

            <div class="ending-section">
                <div class="ending-section-title">🧢 마지막 시즌 선수단 성적</div>
                ${this._buildRosterStatTableHtml()}
            </div>

            <button class="start-season-btn" style="margin-top:24px;" onclick="window.restartCareer()">🔄 새로운 감독으로 다시 시작하기</button>
        </div>`;
    },

    renderSimDetail(type) {
        const step    = GameData.seasonSteps[GameState.currentStepIndex];
        const simArea = document.getElementById('view-simulation');
        if (!simArea) return;

        if (type !== 'stats') return;

        const rows = [];
        if (GameState.selections.sp) GameState.selections.sp.forEach((p, i) => rows.push({ label: `${i+1}선발`, type: 'sp', idx: i, player: p }));
        if (GameState.selections.rp) GameState.selections.rp.forEach((p, i) => rows.push({ label: `중간계투${i+1}`, type: 'rp', idx: i, player: p }));
        if (GameState.selections.cp) rows.push({ label: '마무리(CP)', type: 'cp', idx: undefined, player: GameState.selections.cp });
        if (GameState.battingOrder)  GameState.battingOrder.forEach((key, i) => rows.push({ label: `${i+1}번(${GameData.POSITION_ABBR[key]})`, type: key, idx: undefined, player: GameState.selections[key] }));

        const rowsHtml = rows.map(row => {
            const st = SimEngine.computeStatFor(row.type, row.idx, step);
            const isAlreadySwapped = GameState.swappedPlayers.has(row.player.name);
            const btnHtml = isAlreadySwapped
                ? `<span class="swap-done-label">교체완료(재교체불가)</span>`
                : `<button class="swap-open-btn" onclick="UIController.openSwapModal('${row.type}', ${row.idx === undefined ? 'null' : row.idx})">🔄 교체하기</button>`;

            return `<div class="roster-swap-row">
                <div class="rsw-line1">
                    <span class="rsw-label">${row.label}</span>
                    <span class="rsw-name">${row.player.name}</span>
                    <span class="grade-badge grade-${st.grade}">${st.grade}</span>
                </div>
                <div class="rsw-line2">
                    <span class="rsw-stat">${st.line}</span>
                    ${btnHtml}
                </div>
            </div>`;
        }).join('');

        simArea.innerHTML = `
        <div class="sim-dashboard">
            ${this.moneyBadgeFloatHtml()}
            <button class="action-btn" style="margin-bottom:16px;" onclick="UIController.renderSimSummary()">🔙 대시보드로 돌아가기</button>
            <h3 class="group-title">🧢 로스터 성적 & 선수 교체
                <span style="font-size:0.75rem; color:#94a3b8; font-weight:normal;">교체 수수료 ${GameState.TRADE_FEE}원 부과</span>
            </h3>
            <div class="roster-swap-list">${rowsHtml}</div>
        </div>
        <div id="swap-modal-overlay" class="swap-modal-overlay" style="display:none;" onclick="UIController.closeSwapModal()">
            <div class="swap-modal-box" onclick="event.stopPropagation()">
                <div id="swap-modal-content"></div>
            </div>
        </div>`;
    },

    openSwapModal(type, idx) {
        const overlay = document.getElementById('swap-modal-overlay');
        if (!overlay) return;
        overlay.style.display = 'flex';
        this._buildSwapModalContent(type, idx);
    },

    closeSwapModal() {
        const overlay = document.getElementById('swap-modal-overlay');
        if (overlay) overlay.style.display = 'none';
    },

    _buildSwapModalContent(type, idx) {
        const current = GameState.getCurrentPlayer(type, idx);
        if (!current) return;

        let candidatePool = [];
        if (type === 'dh') {
            const batterTabs = GameData.tabDefs.filter(t => !['sp', 'rp', 'cp'].includes(t.key));
            batterTabs.forEach(tab => { if (tab.pool) candidatePool.push(...tab.pool); });
        } else {
            const tab = GameData.tabDefs.find(t => t.key === type);
            if (tab && tab.pool) candidatePool.push(...tab.pool);
        }
        if (GameData.swapPlayerPool) {
            candidatePool.push(...GameData.swapPlayerPool.filter(p => {
                if (type === 'dh') return !p.isPitcher;
                if (['sp', 'rp', 'cp'].includes(type)) return p.isPitcher && (p.pos === type || (!p.pos && current.isPitcher));
                return p.pos === type || (p.isPitcher === false && !p.pos);
            }));
        }

        const usedBaseNames = GameState.getUsedBaseNames ? GameState.getUsedBaseNames() : new Set();
        const uniquePoolMap = new Map();
        
        candidatePool.forEach(p => {
            if (!p) return;
            // 🌟 버그 수정: 방출하는 본인 이름과 동일한 이름(다른 연도)이라면 중복 검사에서 통과시킴
            const isSamePerson = SimEngine.baseName(p.name) === SimEngine.baseName(current.name);
            if (usedBaseNames.has(SimEngine.baseName(p.name)) && !isSamePerson) return;
            if (GameState.swappedPlayers.has(p.name)) return;
            if (p.name === current.name) return; // 완전 동일 카드는 제외
            if (!uniquePoolMap.has(p.name)) uniquePoolMap.set(p.name, p);
        });
        
        const pool = Array.from(uniquePoolMap.values()).sort((a, b) => (b.ovr - a.ovr) || (a.price - b.price));

        const content = document.getElementById('swap-modal-content');
        if (!content) return;

        if (pool.length === 0) {
            content.innerHTML = `
                <div class="swap-modal-header">
                    <h4>🔄 교체 후보 없음</h4>
                    <button class="swap-modal-close" onclick="UIController.closeSwapModal()">✕</button>
                </div>
                <p style="color:#f87171; padding:20px 0;">해당 포지션에 영입 가능한 선수가 없습니다.</p>`;
            return;
        }

        content.innerHTML = `
            <div class="swap-modal-header">
                <div>
                    <h4>🔄 교체 후보 — <span style="color:#facc15;">${current.name}</span> 방출</h4>
                    <p style="font-size:0.75rem; color:#94a3b8; margin-top:2px;">차액 + 수수료 ${GameState.TRADE_FEE}원이 함께 청구됩니다</p>
                </div>
                <button class="swap-modal-close" onclick="UIController.closeSwapModal()">✕</button>
            </div>
            ${this.moneyBadgeFloatHtml()}
            <div class="swap-modal-grid player-grid" style="margin-top:12px;">
                ${pool.map(c => {
                    const diff      = c.price - current.price;
                    const totalCost = diff + GameState.TRADE_FEE;
                    const canAfford = totalCost <= GameState.earnedMoney;
                    const costLabel = totalCost > 0
                        ? `<span style="color:#f87171;">(총 ${totalCost}원 필요, 차액 ${diff >= 0 ? '+' : ''}${diff}원 + 수수료 ${GameState.TRADE_FEE}원)</span>`
                        : `<span style="color:#4ade80;">(${Math.abs(totalCost)}원 환급, 차액 ${diff >= 0 ? '+' : ''}${diff}원 - 수수료 ${GameState.TRADE_FEE}원)</span>`;
                    return this.generatePlayerCardHtml(c, {
                        isDisabled: !canAfford,
                        priceDiffHtml: `₩${c.price} ${costLabel}`,
                        actionBtnHtml: `<button class="action-btn" style="width:100%; padding:8px; background:${canAfford ? '#2563eb' : '#475569'}; color:#fff; border:none;" ${canAfford ? '' : 'disabled'} onclick="event.stopPropagation(); window.executeSwap('${type}', ${idx === undefined ? 'null' : idx}, '${c.name}')">${canAfford ? '영입하기' : '자금부족'}</button>`
                    });
                }).join('')}
            </div>`;
    }
};
