const GameState = {
    TOTAL_REQUIRED: 18,
    TRADE_FEE: 2, 
    MAX_SEASONS: 5, 
    seasonNumber: 1,         
    totalChampionships: 12,  

    selections: { sp: [], rp: [], cp: null, c: null, inf1: null, inf2: null, inf3: null, inf4: null, of1: null, of2: null, of3: null, dh: null },
    battingOrder: ['of2', 'inf4', 'inf3', 'dh', 'of3', 'of1', 'inf1', 'c', 'inf2'],
    currentTab: 'sp',
    
    earnedMoney: 0,
    loanBalance: 0,
    swappedPlayers: new Set(),
    earnedForStep: new Set(),
    statCache: {},
    standingsCache: {},
    currentStepIndex: 0,
    initialBudgetRemaining: 0,
    historyLogs: [],
    selectedCardForSwap: null,
    

    eventWinRateBonus: 0,
    completedEvents: new Set(),
    eventLogs: [],


    coachName: '',
    seasonNumber: 1,
    careerLog: [], // [{ season, rank, wins, losses, bonus, tier, fired }]
    seasonRivalVariances: null,

    scandalHappenedThisCareer: false,
    faCandidates: [],
    forcedReplacement: null, // { type, idx, playerName, reason } — 스캔들로 빈 슬롯이 생기면 채워질 때까지 유지

    /**
     * 새 시즌을 시작하기 전, 이전 시즌의 진행 상태만 초기화한다.
     * 로스터(selections)와 적립금(earnedMoney)은 그대로 이어진다.
     */
    resetSeasonState() {
        this.currentStepIndex = 0;
        this.swappedPlayers = new Set();
        this.earnedForStep = new Set();
        this.historyLogs = [];
        this.standingsCache = {};
        this.statCache = {};
        this.selectedCardForSwap = null;
        this.eventWinRateBonus = 0;
        this.completedEvents = new Set();
        this.eventLogs = [];
        this.seasonRivalVariances = null;
        this.getAllSelectedPlayers().forEach(p => {
            delete p._seasonVariance;
            p.joinedStep = 0;
        });
    },

    getAllSelectedPlayers() {
        // 🌟 스캔들(영구 경질) 등으로 슬롯이 null이 될 수 있으므로 항상 필터링한다.
        const list = [...this.selections.sp, ...this.selections.rp].filter(Boolean);
        if (this.selections.cp) list.push(this.selections.cp);
        Object.keys(GameData.POSITION_LABEL).forEach(k => {
            if (this.selections[k]) list.push(this.selections[k]);
        });
        return list;
    },
    getUsedBaseNames() { return new Set(this.getAllSelectedPlayers().map(p => SimEngine.baseName(p.name))); },
    selectedCount() {
        let n = this.selections.sp.filter(Boolean).length + this.selections.rp.filter(Boolean).length + (this.selections.cp ? 1 : 0);
        Object.keys(GameData.POSITION_LABEL).forEach(k => { if (this.selections[k]) n++; });
        return n;
    },
    // 🌟 스캔들로 인한 강제 영입이 아직 처리되지 않았는지 확인
    hasUnresolvedForcedReplacement() { return !!this.forcedReplacement; },
    totalSpent() { return this.getAllSelectedPlayers().reduce((s, p) => s + p.price, 0); },
    getCurrentPlayer(type, idx) {
        if (type === 'sp' || type === 'rp') return this.selections[type][idx];
        return this.selections[type];
    },
    setPlayer(type, idx, player) {
        if (type === 'sp' || type === 'rp') this.selections[type][idx] = player;
        else this.selections[type] = player;
    }
};
