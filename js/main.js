window.startCareer = () => {
    const input = document.getElementById('coach-name-input');
    const name = input ? input.value.trim() : '';
    if (!name) {
        alert('감독님의 성함을 입력해주세요!');
        if (input) input.focus();
        return;
    }
    GameState.coachName = name.slice(0, 12);
    UIController.switchStage('DRAFT');
    UIController.updateStickyAndBoard();
};

window.prepareNextSeason = () => {
    GameState.seasonNumber++;
    
    const currentYear = 2026 + (GameState.seasonNumber - 1); // 2026년 기준, 2년차는 2027년
    alert(`📢 [시즌 개막]\n\n드디어 기다리던 ${currentYear}시즌이 막을 올립니다!\n올해 목표는 통합 우승과 통산 V${(GameState.totalChampionships || 12) + 1} 달성입니다. 감독님의 야구력을 보여주세요!`);

    GameState.resetSeasonState(); // 새 시즌 상태로 먼저 초기화한 뒤 전지훈련 효과를 반영한다.

    // 🌟 2~3년차 시즌 개막 시 1회, 40% 확률로 선수 영구 경질 스캔들 발생
    const scandal = SimEngine.checkRandomScandalEvent();
    if (scandal) {
        alert(scandal.reason);
    }

    const camps = GameData.trainingCampEvents;
    const camp = camps[Math.floor(Math.random() * camps.length)];
    UIController.showEventModal(camp, () => {
        if (!GameState.earnedForStep.has(0)) {
            SimEngine.applyEarnings(GameData.seasonSteps[0]);
            GameState.earnedForStep.add(0);
        }
        UIController.switchStage('SIMULATION');
    });
};
// 🌟 감독 커리어 완전 종료(경질 or 5시즌 완주) 후 처음부터 다시 시작
window.restartCareer = () => {
    window.location.reload();
};

window.goToStadium = () => {
    if (GameState.selectedCount() < GameState.TOTAL_REQUIRED) {
        alert(`모든 18개 슬롯을 채워야 이동할 수 있습니다! (현재 ${GameState.selectedCount()}/${GameState.TOTAL_REQUIRED})`);
        return;
    }
    const spent = GameState.totalSpent();
    if (spent > 100) {
        alert(`예산을 초과했습니다! (${spent}원 사용, 100원 이하로 맞춰주세요)`);
        return;
    }
    const remaining = 100 - spent;
    GameState.initialBudgetRemaining = remaining;
    GameState.earnedMoney = remaining;
    UIController.switchStage('STADIUM');
};

window.toggleMulti = (tabKey, playerName) => {
    const tab = GameData.tabDefs.find(t => t.key === tabKey);
    const arr = GameState.selections[tabKey];
    const idx = arr.findIndex(p => p.name === playerName);
    if (idx >= 0) arr.splice(idx, 1);
    else {
        const player = tab.pool.find(p => p.name === playerName);
        if (GameState.getUsedBaseNames().has(SimEngine.baseName(player.name))) {
            alert('이미 로스터에 같은 선수(다른 연도 포함)가 선택되어 있습니다!'); return;
        }
        if (arr.length >= tab.max) {
            alert(`${tab.label}은 최대 ${tab.max}명까지 선택할 수 있습니다.`); return;
        }
        arr.push(player);
    }
    UIController.renderNavTabs();
    UIController.renderCurrentTab();
    UIController.updateStickyAndBoard();
};

window.selectSingle = (tabKey, playerName) => {
    const tab = GameData.tabDefs.find(t => t.key === tabKey);
    if (GameState.selections[tabKey] && GameState.selections[tabKey].name === playerName) {
        GameState.selections[tabKey] = null;
    } else {
        const player = tab.pool.find(p => p.name === playerName);
        if (GameState.getUsedBaseNames().has(SimEngine.baseName(player.name))) {
            alert('이미 로스터에 같은 선수(다른 연도 포함)가 선택되어 있습니다!'); return;
        }
        GameState.selections[tabKey] = player;
    }
    UIController.renderNavTabs();
    UIController.renderCurrentTab();
    UIController.updateStickyAndBoard();
};

window.stadiumCardClick = (group, type, idx) => {
    const sel = GameState.selectedCardForSwap;
    if (sel && sel.group === group && sel.type === type && sel.idx === idx) {
        GameState.selectedCardForSwap = null;
        UIController.renderStadiumView(document.getElementById('stadium-container'));
        return;
    }
    let name;
    if (group === 'pitcher') {
        name = GameState.selections[type][idx]?.name;
    } else {
        name = GameState.selections[type]?.name;
    }
    GameState.selectedCardForSwap = { group, type, idx, name };
    UIController.renderStadiumView(document.getElementById('stadium-container'));
};

window.stadiumCardSwap = (group, type2, idx2) => {
    const sel = GameState.selectedCardForSwap;
    if (!sel) return;

    if (sel.type === type2 && sel.idx === idx2) {
        GameState.selectedCardForSwap = null;
        UIController.renderStadiumView(document.getElementById('stadium-container'));
        return;
    }

    if (group === 'pitcher') {
        // 🌟 버그 방어: CP(마무리)는 배열이 아니므로 스왑 로직 진입 시 무시하도록 처리
        if (sel.type === 'cp' || type2 === 'cp') {
            alert('마무리 투수는 순서를 바꿀 수 없습니다.');
            GameState.selectedCardForSwap = null;
            UIController.renderStadiumView(document.getElementById('stadium-container'));
            return;
        }

        const arr1 = GameState.selections[sel.type];
        const arr2 = GameState.selections[type2];
        const i1   = sel.idx;
        const i2   = idx2;

        if (sel.type === type2) {
            [arr1[i1], arr1[i2]] = [arr1[i2], arr1[i1]];
        } else {
            const tmp = arr1[i1];
            arr1[i1] = arr2[i2];
            arr2[i2] = tmp;
        }
    } else {
        const i1 = sel.idx;
        const i2 = idx2;
        [GameState.battingOrder[i1], GameState.battingOrder[i2]] =
            [GameState.battingOrder[i2], GameState.battingOrder[i1]];
    }

    GameState.selectedCardForSwap = null;
    UIController.renderStadiumView(document.getElementById('stadium-container'));
    UIController.updateStickyAndBoard();
};

window.stadiumCancelSwap = () => {
    GameState.selectedCardForSwap = null;
    UIController.renderStadiumView(document.getElementById('stadium-container'));
};

window.startSim = () => {
    GameState.resetSeasonState();

    if (!GameState.earnedForStep.has(0)) {
        SimEngine.applyEarnings(GameData.seasonSteps[0]);
        GameState.earnedForStep.add(0);
    }
    UIController.switchStage('SIMULATION');
};

window.nextSeasonStep = (skipEventCheck = false) => {
    // 🌟 1. 다음 구간으로 넘어갈 때 발동할 랜덤 이벤트가 있는지 체크
    if (!skipEventCheck && GameData.randomEvents) {
        const targetStepIndex = GameState.currentStepIndex + 1;
        // 🌟 같은 구간 전환 시점에 여러 개의 이벤트 후보가 등록되어 있을 수 있으므로
        // 그 중 하나를 무작위로 골라 매 플레이마다 다른 이벤트를 경험하게 한다.
        const candidateEvents = GameData.randomEvents.filter(e => e.targetStep === targetStepIndex);
        const pendingEvent = candidateEvents.length > 0
            ? candidateEvents[Math.floor(Math.random() * candidateEvents.length)]
            : null;

        if (pendingEvent && (!GameState.completedEvents || !GameState.completedEvents.has(targetStepIndex))) {
            if (!GameState.completedEvents) GameState.completedEvents = new Set();
            
            // UIController의 이벤트 모달 호출
            UIController.showEventModal(pendingEvent, () => {
                // 이벤트 선택 및 결과 확인 완료 후 다시 다음 스텝 진행 (중복 방지 플래그 적용)
                window.nextSeasonStep(true);
            });
            return; // 이벤트 진행 중에는 시뮬레이션으로 넘어가지 않음
        }
    }

    // 2. 이벤트가 없거나 끝났다면 정상적으로 다음 스텝 진행
    GameState.currentStepIndex++;
    
    if (GameState.currentStepIndex >= GameData.seasonSteps.length) {
        return;
    }

    if (!GameState.earnedForStep) GameState.earnedForStep = new Set();
    if (!GameState.earnedForStep.has(GameState.currentStepIndex)) {
        SimEngine.applyEarnings(GameData.seasonSteps[GameState.currentStepIndex]);
        GameState.earnedForStep.add(GameState.currentStepIndex);
    }
    
    UIController.renderSimSummaryWithLoading();
};

// 🌟 이벤트 선택지 클릭 시 호출되는 전역 함수 연결
window.chooseEventOption = (idx) => {
    // UIController 안의 showEventModal에서 정의된 콜백과 연동
    if (window._currentEventObj) {
        const result = SimEngine.resolveEvent(window._currentEventObj, idx);
        if (!result || result.error) {
            alert(result ? result.error : '오류가 발생했습니다.');
            return;
        }
    }
};

window.executeSwap = (type, idx, candidateName) => {
    const current = GameState.getCurrentPlayer(type, idx);
    let candidate = GameData.swapPlayerPool.find(p => p.name === candidateName);
    
    if (!candidate) {
        const tab = GameData.tabDefs.find(t => t.key === type);
        if (tab) candidate = tab.pool.find(p => p.name === candidateName);
    }
    if (!candidate) {
        for (const tab of GameData.tabDefs) {
            candidate = tab.pool.find(p => p.name === candidateName);
            if (candidate) break;
        }
    }
    if (!candidate) { alert('선수를 찾을 수 없습니다.'); return; }

    // 🌟 선수 교체 시 가격 차액 + 고정 수수료(TRADE_FEE)를 부담한다.
    //    (예: 4원 선수를 팔고 6원 선수를 영입 -> 차액 2원 + 수수료 2원 = 총 4원 필요)
    const diff = candidate.price - current.price;
    const totalCost = diff + GameState.TRADE_FEE;
    if (totalCost > GameState.earnedMoney) {
        alert(`적립금이 부족합니다. (보유 ${GameState.earnedMoney}원, 필요 ${totalCost}원 — 차액 ${diff}원 + 수수료 ${GameState.TRADE_FEE}원)`);
        return;
    }

    GameState.earnedMoney -= totalCost;

    // 🌟 sp/rp는 배열이라 실제 숫자 idx를 쓰지만, 그 외 단일 슬롯은 항상 null로 넘어온다.
    // 최종 결산 화면(finalRows)에서는 해당 슬롯들을 idx: undefined 로 표기하므로,
    // null !== undefined 로 인해 교체 이력이 매칭되지 않던 버그를 방지하기 위해 정규화한다.
    const normalizedIdx = (idx === null) ? undefined : idx;

    const step = GameData.seasonSteps[GameState.currentStepIndex];
    const st   = SimEngine.computeStatFor(type, normalizedIdx, step);
    GameState.historyLogs.push({
        player: current, type, idx: normalizedIdx,
        joinedStep: current.joinedStep || 0,
        leftStep: GameState.currentStepIndex,
        statLine: st.line, statGrade: st.grade,
        tradeCost: diff
    });

    candidate.joinedStep = GameState.currentStepIndex + 1;
    GameState.setPlayer(type, idx, candidate);
    GameState.swappedPlayers.add(candidate.name);
    
    GameState.statCache = {};

    UIController.closeSwapModal();
    UIController.updateStickyAndBoard();

    const msg = totalCost > 0 ? `${totalCost}원 차감 (차액 ${diff}원 + 수수료 ${GameState.TRADE_FEE}원)`
        : (totalCost < 0 ? `${Math.abs(totalCost)}원 환급` : `추가 비용 없음`);
    setTimeout(() => {
        alert(`${current.name} → ${candidate.name} 교체 완료! (${msg})`);
        UIController.renderSimDetail('stats');
    }, 150);
};

// 🌟 강제 영입(스캔들로 빈 자리 / FA 이탈로 빈 자리) 처리.
// 환급이나 차액 계산 없이 후보 가격 전액을 요구하며, 자금이 부족하면 20% 이자의 긴급 대출을 자동으로 적용한다.
window.executeForcedSwap = (type, idx, candidateName, mode) => {
    let candidate = GameData.swapPlayerPool.find(p => p.name === candidateName);
    if (!candidate) {
        for (const tab of GameData.tabDefs) {
            candidate = tab.pool.find(p => p.name === candidateName);
            if (candidate) break;
        }
    }
    if (!candidate) { alert('선수를 찾을 수 없습니다.'); return; }

    const cost = candidate.price;
    const usedLoan = cost > GameState.earnedMoney;
    if (usedLoan) SimEngine.processLoan(cost);
    GameState.earnedMoney -= cost;

    const normalizedIdx = (idx === null) ? undefined : idx;
    candidate.joinedStep = GameState.currentStepIndex + 1;
    GameState.setPlayer(type, normalizedIdx, candidate);
    GameState.swappedPlayers.add(candidate.name);
    GameState.statCache = {};

    const loanMsg = usedLoan ? `\n(자금 부족으로 대출 실행 — 현재 대출 잔액 ${GameState.loanBalance}원, 다음 정산에서 20% 이자 포함 자동 차감됩니다)` : '';
    alert(`${candidate.name} 선수를 긴급 영입했습니다! (${cost}원 지출)${loanMsg}`);

    UIController.updateStickyAndBoard();

    if (mode === 'restock') {
        UIController.renderRosterRestockView();
    } else {
        GameState.forcedReplacement = null;
        UIController.renderSimSummary();
    }
};

window.addEventListener('DOMContentLoaded', () => {
    if (typeof GameData !== 'undefined' && typeof UIController !== 'undefined') {
        UIController.switchStage('INTRO');
    }
});
