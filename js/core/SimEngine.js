const SimEngine = {
    randomSalt: Math.floor(Math.random() * 100000),

    baseName(name) { return name.replace(/^\d+\s*/, '').replace(/\(국대\)/, '').trim(); },
    clampNum(v, min, max) { return Math.max(min, Math.min(max, v)); },

    pseudoRandom(seed1, seed2) {
        const x = Math.sin(seed1 * 12.9898 + seed2 * 78.233) * 43758.5453123;
        return x - Math.floor(x);
    },
processLoan(amountNeeded) {
        const shortfall = amountNeeded - GameState.earnedMoney;
        if (shortfall <= 0) return true;
        
        GameState.loanBalance += Math.ceil(shortfall * 1.2); 
        GameState.earnedMoney = amountNeeded; 
        return true;
    },

// 수익 정산 시 대출금 자동 차감
    applyEarningsWithLoanCheck(actualEarn) {
        if (GameState.loanBalance > 0) {
            if (GameState.earnedMoney + actualEarn >= GameState.loanBalance) {
                const remaining = (GameState.earnedMoney + actualEarn) - GameState.loanBalance;
                GameState.loanBalance = 0;
                GameState.earnedMoney = remaining;
            } else {
                GameState.loanBalance -= (GameState.earnedMoney + actualEarn);
                GameState.earnedMoney = 0;
            }
        } else {
            GameState.earnedMoney += actualEarn;
        }
    },
    hashStr(str) {
        let h = 0;
        for (let i = 0; i < str.length; i++) { h = (h * 31 + str.charCodeAt(i)) >>> 0; }
        return h;
    },

    // 🌟 2~3년차 시즌에 한 번(커리어 통틀어 1회, 40% 확률)만 발생하는 영구 경질 스캔들.
    // 보상금 없이 슬롯을 비우고, forcedReplacement 플래그로 UI가 즉시 강제 영입 화면을 띄우게 한다.
    checkRandomScandalEvent() {
        if (GameState.scandalHappenedThisCareer) return null;
        if (GameState.seasonNumber !== 2 && GameState.seasonNumber !== 3) return null;
        if (Math.random() >= 0.4) return null; // 40% 확률

        GameState.scandalHappenedThisCareer = true;

        const slots = [];
        GameState.selections.sp.forEach((p, i) => { if (p) slots.push({ type: 'sp', idx: i, player: p }); });
        GameState.selections.rp.forEach((p, i) => { if (p) slots.push({ type: 'rp', idx: i, player: p }); });
        if (GameState.selections.cp) slots.push({ type: 'cp', idx: null, player: GameState.selections.cp });
        Object.keys(GameData.POSITION_LABEL).forEach(k => {
            if (GameState.selections[k]) slots.push({ type: k, idx: null, player: GameState.selections[k] });
        });
        if (slots.length === 0) return null;

        const picked = slots[Math.floor(Math.random() * slots.length)];
        const reasons = ['불법 스포츠 도박 연루', '상습 음주운전 적발', '경기 승부조작 의혹 연루', '팀 규율 위반 및 라커룸 폭행 사건'];
        const reason = reasons[Math.floor(Math.random() * reasons.length)];

        if (picked.type === 'sp' || picked.type === 'rp') {
            GameState.selections[picked.type][picked.idx] = null;
        } else {
            GameState.selections[picked.type] = null;
        }

        GameState.forcedReplacement = {
            type: picked.type,
            idx: picked.idx,
            playerName: picked.player.name,
            reason: `🚨 [긴급 속보] 주전 선수 [${picked.player.name}]가 [${reason}]에 연루되어 구단으로부터 영구 경질(방출) 조치를 당했습니다.\n\n위약금·보상금은 일절 지급되지 않으며, 감독님은 가용 자금(부족 시 20% 이자의 긴급 대출)을 사용해 즉시 대체 선수를 영입해야 합니다.`
        };
        return GameState.forcedReplacement;
    },

    // 🌟 리그 순위 산출 (시즌이 지속될수록 타 팀 전력 대폭 상승 반영)
    getLeagueStandings(gamesPlayed) {
        if (!GameState.standingsCache) GameState.standingsCache = {};
        if (GameState.standingsCache[gamesPlayed]) return GameState.standingsCache[gamesPlayed];

        if (!GameState.seasonRivalVariances) {
            GameState.seasonRivalVariances = {};
            GameData.rivalTeams.forEach(t => { GameState.seasonRivalVariances[t.name] = (Math.random() - 0.5) * 30.0; });
        }

        const prevGames = Object.keys(GameState.standingsCache).map(Number).sort((a,b)=>b-a)[0] || 0;
        const prevStandings = GameState.standingsCache[prevGames] ||
            GameData.rivalTeams.map(t => ({ name: t.name, wins: 0, losses: 0 }))
                .concat([{ name: 'KIA 타이거즈 (내 팀)', wins: 0, losses: 0, isMy: true }]);

        const myPower = this.calculateMyTeamPower();
        const gamesDelta = gamesPlayed - prevGames;

        // 시즌이 거듭될수록(2년차, 3년차...) 상대 팀들의 기본 전력이 점진적으로 강력해짐
        const multiSeasonDifficultyBoost = (GameState.seasonNumber - 1) * 7.0;
        // 내 팀 전력이 지나치게 높아지면(자금으로 초강력 선수단을 꾸리면) 리그 전체도 동반 상승 — 무한 스노우볼 방지
        const adaptiveDifficultyBoost = Math.max(0, myPower.total - 86) * 0.65;

        const allTeams = GameData.rivalTeams.map((rival, index) => {
            const seed = (index + 1) * 419 + gamesPlayed * 107;
            const microVariance = (this.pseudoRandom(seed, gamesPlayed) - 0.5) * 8.0;
            const seasonCondition = GameState.seasonRivalVariances[rival.name];
            const lateSeasonBoost = (gamesPlayed / 144) * 9.0;

            return { 
                name: rival.name, 
                power: rival.power + seasonCondition + microVariance + lateSeasonBoost + multiSeasonDifficultyBoost + adaptiveDifficultyBoost, 
                isMy: false 
            };
        });

        const mySeed = 8888 + gamesPlayed * 163;
        const myMicroVariance = (this.pseudoRandom(mySeed, gamesPlayed) - 0.5) * 5.0;
        allTeams.push({ name: 'KIA 타이거즈 (내 팀)', power: myPower.total + myMicroVariance, isMy: true });

        allTeams.sort((a, b) => b.power - a.power);

        const result = allTeams.map((team, index) => {
            let baseWinRate = 0.66 - (index * 0.048);
            if (team.isMy) {
                const powerDiff = myPower.total - 80;
                baseWinRate = 0.46 + (powerDiff * 0.012) + (GameState.eventWinRateBonus || 0);
            }
            baseWinRate = this.clampNum(baseWinRate, 0.15, 0.85);

            const deltaWins   = Math.round(gamesDelta * baseWinRate);
            const deltaLosses = gamesDelta - deltaWins;

            const prev = prevStandings.find(t => t.name === team.name) || { wins: 0, losses: 0 };
            const totalWins   = prev.wins   + deltaWins;
            const totalLosses = prev.losses + deltaLosses;

            return {
                name: team.name,
                wins: totalWins,
                losses: totalLosses,
                winRate: (totalWins / (totalWins + totalLosses || 1)).toFixed(3).replace(/^0/, ''),
                isMy: team.isMy
            };
        });

        result.sort((a, b) => parseFloat(b.winRate) - parseFloat(a.winRate));
        result.forEach((t, i) => t.rank = i + 1);

        GameState.standingsCache[gamesPlayed] = result;
        return result;
    },
    /**
     */
    calculateMyTeamPower() {
        const players = GameState.getAllSelectedPlayers ? GameState.getAllSelectedPlayers() : [];
        if (players.length === 0) return {
            total: 70, pitching: 70, batting: 70, defense: 70,
            avgCon: 70, avgPow: 70, avgSpd: 70,
            identityTags: [], synergies: {},
            synergyDetails: []
        };

        let pitchingSum = 0, pitchingCount = 0;
        let spSum = 0, spCount = 0;
        let bpSum = 0, bpCount = 0;

        let battingSum = 0, battingCount = 0;
        let defenseSum = 0, speedSum = 0, powerSum = 0, contactSum = 0;
        let pitcherCtrlSum = 0, pitcherSpdSum = 0, pitcherOvrSum = 0;

        let kiaChampCount = 0;
        let hasAnchi = false;
        let hasKimseon = false;
        let nationalCount = 0;
        let traitorCount = 0;
        let eliteSpdCount = 0;
        let elitePowCount = 0;
        let hasSun = false;      // 선동열
        let hasYim = false;      // 임창용
        let hasYang = false;     // 양현종
        let hasLeeEU = false;    // 이의리
        let hasChoiHU = false;   // 최형우
        let hasNa = false;       // 나성범
        let hasDoYeong = false;  // 김도영
        let hasJongBeom = false; // 이종범
        let hasHeesop = false;   // 최희섭
        let hasBumho = false;    // 이범호

        let hasJangHS = false;   // 장현식
        let hasJeonSH = false;   // 전상현
        let hasJungHY = false;   // 정해영
        const traitors = ['최형우', '홍종표', '최원준', '박동원', '이용규'];

        let oldPlayerCount = 0;
        const prices = [];

players.forEach(p => {
            const yearMatch = p.name.match(/^(\d{2})/);
            const pYear = yearMatch ? parseInt(yearMatch[1]) : 50;
            const pYearStr = yearMatch ? yearMatch[1] : '';
            
            if ((pYear >= 80 && pYear <= 99) || (pYear >= 0 && pYear <= 10)) {
                oldPlayerCount++;
            }

            if (typeof p.price === 'number') {
                prices.push(p.price);
            }
            
            if (pYearStr === '09' || pYearStr === '17' || pYearStr === '24') {
                kiaChampCount++;
            }
            if (p.name.includes('안치홍')) hasAnchi = true;
            if (p.name.includes('김선빈')) hasKimseon = true;
            if (p.isNational) nationalCount++;
            if (p.name.includes('선동열')) hasSun = true;
            if (p.name.includes('임창용')) hasYim = true;
            if (p.name.includes('양현종')) hasYang = true;
            if (p.name.includes('이의리')) hasLeeEU = true;
            if (p.name.includes('최형우')) hasChoiHU = true;
            if (p.name.includes('나성범')) hasNa = true;
            if (p.name.includes('김도영')) hasDoYeong = true;
            if (p.name.includes('이종범')) hasJongBeom = true;
            if (p.name.includes('최희섭')) hasHeesop = true;
            if (p.name.includes('이범호')) hasBumho = true;

            if (p.name.includes('장현식')) hasJangHS = true;
            if (p.name.includes('전상현')) hasJeonSH = true;
            if (p.name.includes('정해영')) hasJungHY = true;
            if (traitors.some(t => p.name.includes(t))) traitorCount++;
            if (p.spd >= 85) eliteSpdCount++;
            if (p.pow >= 85) elitePowCount++;

            if (p.isPitcher) {
                const effectiveStuff = (p.ctrl * 0.40 + p.spd * 0.30 + p.mtl * 0.18 + p.stm * 0.12);
                pitchingSum += effectiveStuff;
                pitcherCtrlSum += p.ctrl;
                pitcherSpdSum += p.spd;
                pitcherOvrSum += p.ovr;
                pitchingCount++;

                const isSP = p.type === 'sp' || p.key === 'sp' || (p.stm && p.stm >= 80);
                if (isSP) {
                    spSum += effectiveStuff;
                    spCount++;
                } else {
                    bpSum += effectiveStuff;
                    bpCount++;
                }
            } else {
                const rawBatting = (p.con * 0.50 + p.pow * 0.50);
                const powerBonus = p.pow >= 85 ? (p.pow - 84) * 0.5 : 0;
                battingSum += (rawBatting + powerBonus);
                contactSum += p.con;
                powerSum += p.pow;
                speedSum += p.spd;
                defenseSum += p.def;
                battingCount++;
            }
        });
        
        const defenseCount = battingCount;

        const pitching = pitchingCount > 0 ? pitchingSum / pitchingCount : 70;
        const avgSp = spCount > 0 ? spSum / spCount : 70;
        const avgBp = bpCount > 0 ? bpSum / bpCount : 70;

        const batting  = battingCount  > 0 ? battingSum  / battingCount  : 70;
        const defense  = defenseCount  > 0 ? defenseSum  / defenseCount  : 70;

        const avgCon = battingCount > 0 ? contactSum / battingCount : 70;
        const avgPow = battingCount > 0 ? powerSum   / battingCount : 70;
        const avgSpd = battingCount > 0 ? speedSum   / battingCount : 70;
        const avgPitcherCtrl = pitchingCount > 0 ? pitcherCtrlSum / pitchingCount : 70;
        const avgPitcherSpd  = pitchingCount > 0 ? pitcherSpdSum  / pitchingCount : 70;
        const avgPitcherOvr  = pitchingCount > 0 ? pitcherOvrSum  / pitchingCount : 70;

        const identityTags = [];
        const synergyDetails = [];
        let synergyBonus = 0;

        if (traitorCount >= 4) {
            identityTags.push('💔 돌아올 수 없는 강');
            synergyDetails.push({ tag: '💔 돌아올 수 없는 강', desc: `타이거즈를 좋지 않게 떠난 선수 ${traitorCount}명 소집... 라커룸 내부 폭발로 팀워크가 완전히 박살났습니다.`, color: '#7f1d1d' });
            synergyBonus -= 22.0; // 🚨 대폭 강화
        } else if (traitorCount === 3) {
            identityTags.push('⚠️ 위험한 결합');
            synergyDetails.push({ tag: '⚠️ 위험한 결합', desc: `타이거즈를 좋지 않게 떠난 선수 ${traitorCount}명... 극심한 파벌 싸움으로 승부처마다 자멸합니다.`, color: '#991b1b' });
            synergyBonus -= 14.0; 
        } else if (traitorCount === 2) {
            identityTags.push('💢 불편한 동거');
            synergyDetails.push({ tag: '💢 불편한 동거', desc: `타이거즈를 좋지 않게 떠난 선수 ${traitorCount}명... 쌀쌀한 라커룸 공기로 경기력이 저하됩니다.`, color: '#b91c1c' });
            synergyBonus -= 7.0;
        } else if (traitorCount === 1) {
            identityTags.push('👁️ 앙금의 씨앗');
            synergyDetails.push({ tag: '👁️ 앙금의 씨앗', desc: `타이거즈를 좋지 않게 떠난 선수 ${traitorCount}명 포진... 미묘한 긴장감이 감돕니다.`, color: '#dc2626' });
            synergyBonus -= 3.0;
        }
        if (hasSun && hasYim) {
            identityTags.push('🔥 국동과 뱀직구');
            synergyDetails.push({ tag: '🔥 국동과 뱀직구', desc: '선동열-임창용 동시 보유! 상대 타선을 완벽히 압도하는 무적의 마운드', color: '#a855f7' });
            synergyBonus += 5.5;
        }

        if (hasYang && hasLeeEU) {
            identityTags.push('🐅 좌완 에이스 계보');
            synergyDetails.push({ tag: '🐅 좌완 에이스 계보', desc: '양현종-이의리 선발 출격! 좌완 에이스들의 이닝 소화력 급증', color: '#38bdf8' });
            synergyBonus += 3.5;
        }

        if (hasChoiHU && hasNa) {
            identityTags.push('💣 H-N 좌타 클린업');
            synergyDetails.push({ tag: '💣 H-N 좌타 클린업', desc: '최형우-나성범 파괴적 중첩! 리그 최강의 좌타 클린업 화력 폭발', color: '#f43f5e' });
            synergyBonus += 4.0;
        }

        if (hasDoYeong && hasJongBeom) {
            identityTags.push('⚡ 타이거즈의 과거와 미래');
            synergyDetails.push({ tag: '⚡ 타이거즈의 과거와 미래', desc: '이종범-김도영 동시 포진! 30-30 & 80도루의 미친 기동력과 장타력', color: '#10b981' });
            synergyBonus += 6.0;
        }

        if (hasJangHS && hasJeonSH && hasJungHY) {
            identityTags.push('🔒 J-J-J 철벽 불펜');
            synergyDetails.push({ tag: '🔒 J-J-J 철벽 불펜', desc: '장현식-전상현-정해영 필승조 완성! 6회 이후 승리를 완벽히 사수합니다.', color: '#6366f1' });
            synergyBonus += 5.0;
        }

        if (hasHeesop && hasBumho) {
            identityTags.push('⚾ 클러치 사나이들');
            synergyDetails.push({ tag: '⚾ 클러치 사나이들', desc: '최희섭-이범호 클러치 듀오! 승부처 득점권 상황에서 타격 상승', color: '#f59e0b' });
            synergyBonus += 3.0;
        }
        if (oldPlayerCount >= 5) {
            identityTags.push('👵 노장 투혼과 체력 한계');
            synergyDetails.push({ tag: '👵 노장 투혼과 체력 한계', desc: `90년대 감성 레전드 ${oldPlayerCount}명... 체력 방전과 에이징 커브로 후반 실점 폭증`, color: '#d97706' });
            synergyBonus -= 10.0;
        } else if (oldPlayerCount >= 3) {
            identityTags.push('☕ 베테랑의 무게감');
            synergyDetails.push({ tag: '☕ 베테랑의 무게감', desc: `90년대 선수가 ${oldPlayerCount}명 포진... 체력 안배가 절실합니다.`, color: '#f59e0b' });
            synergyBonus -= 4.0;
        }


        if (prices.length > 0) {
            const maxPrice = Math.max(...prices);
            const minPrice = Math.min(...prices);
            const priceSpread = maxPrice - minPrice;

            if (priceSpread >= 12) {
                identityTags.push('💸 빈부격차 라커룸');
                synergyDetails.push({ tag: '💸 빈부격차 라커룸', desc: `최고가(${maxPrice}원)와 최저가(${minPrice}원)의 극심한 격차... 선수단 불화 발생`, color: '#b45309' });
                synergyBonus -= 8.0;
            }
        }


        if (eliteSpdCount >= 5) {
            identityTags.push('🌪️ 폭풍의 그라운드');
            synergyDetails.push({ tag: '🌪️ 폭풍의 그라운드', desc: `스피드 85 이상 ${eliteSpdCount}명! 베이스를 훔치는 미친 기동력`, color: '#10b981' });
            synergyBonus += 5.5;
        } else if (eliteSpdCount >= 3) {
            identityTags.push('💨 쌕쌕이 특공대');
            synergyDetails.push({ tag: '💨 쌕쌕이 특공대', desc: `스피드 85 이상 ${eliteSpdCount}명! 상대를 흔드는 발야구`, color: '#34d399' });
            synergyBonus += 2.5;
        }

        if (elitePowCount >= 5) {
            identityTags.push('🌋 핵타선 강림');
            synergyDetails.push({ tag: '🌋 핵타선 강림', desc: `파워 85 이상 ${elitePowCount}명! 스치면 넘어가는 공포의 라인업`, color: '#f43f5e' });
            synergyBonus += 5.5;
        } else if (elitePowCount >= 3) {
            identityTags.push('💣 일발장타');
            synergyDetails.push({ tag: '💣 일발장타', desc: `파워 85 이상 ${elitePowCount}명! 언제든 터질 수 있는 한 방`, color: '#fb7185' });
            synergyBonus += 2.5;
        }


        if (hasAnchi && hasKimseon) {
            identityTags.push('🤝 영혼의 키스톤');
            synergyDetails.push({ tag: '🤝 영혼의 키스톤', desc: '안치홍-김선빈 동시 출격! 내야 수비 극강 안정 및 응집력 폭발', color: '#fbbf24' });
            synergyBonus += 4.5;
        }

        if (kiaChampCount >= 11) {
            identityTags.push('🏆 왕조의 재림 III'); synergyDetails.push({ tag: '🏆 왕조의 재림 III', desc: '우승 멤버 11명 이상! 압도적인 V13 우승 DNA 폭발', color: '#ef4444' }); synergyBonus += 9.0;
        } else if (kiaChampCount >= 9) {
            identityTags.push('🏆 왕조의 재림 II'); synergyDetails.push({ tag: '🏆 왕조의 재림 II', desc: '우승 멤버 9명 이상! 팀 전체 능력치 크게 상승', color: '#ef4444' }); synergyBonus += 5.5;
        } else if (kiaChampCount >= 7) {
            identityTags.push('🏆 왕조의 재림 I'); synergyDetails.push({ tag: '🏆 왕조의 재림 I', desc: '우승 멤버 7명 이상! 중요한 승부처에서 강해짐', color: '#ef4444' }); synergyBonus += 3.0;
        }

        let nationalBonusFactor = 0; 
        if (nationalCount >= 8) {
            identityTags.push('🇰🇷 국가대표 드림팀'); synergyDetails.push({ tag: '🇰🇷 국가대표 드림팀', desc: `국가대표 ${nationalCount}명! 빅게임마다 각성`, color: '#c60c30' }); synergyBonus += 9.5; nationalBonusFactor = 1.0;
        } else if (nationalCount >= 6) {
            identityTags.push('🇰🇷 태극전사 군단'); synergyDetails.push({ tag: '🇰🇷 태극전사 군단', desc: `국가대표 ${nationalCount}명! 중요 경기에 강함`, color: '#0047a0' }); synergyBonus += 5.5; nationalBonusFactor = 0.55;
        } else if (nationalCount >= 4) {
            identityTags.push('🇰🇷 태극마크의 자부심'); synergyDetails.push({ tag: '🇰🇷 태극마크의 자부심', desc: `국가대표 ${nationalCount}명! 국제경기 경험 버프`, color: '#c60c30' }); synergyBonus += 2.8; nationalBonusFactor = 0.28;
        }


        if (avgSp >= 90 && avgBp >= 82) {
            identityTags.push('👑 완벽한 투수 왕국'); 
            synergyDetails.push({ tag: '👑 완벽한 투수 왕국', desc: `선발(${avgSp.toFixed(1)}) & 불펜(${avgBp.toFixed(1)}) 완벽 조화! 약점이 없는 철벽 마운드`, color: '#a855f7' }); 
            synergyBonus += 7.5;
        } 

        else if (avgSp >= 87 && avgBp < 72) {
            identityTags.push('🔥 선발 혹사 & 불펜 방화'); 
            synergyDetails.push({ tag: '🔥 선발 혹사 & 불펜 방화', desc: `선발(${avgSp.toFixed(1)})은 막강하지만 불펜(${avgBp.toFixed(1)})이 불을 질러 후반 역전패 폭증!`, color: '#ef4444' }); 
            synergyBonus -= 5.0; // 🚨 치명적인 마이너스
        } else if (avgSp >= 83 && avgBp < 70) {
            identityTags.push('⚠️ 조마조마한 선발 야구'); 
            synergyDetails.push({ tag: '⚠️ 조마조마한 선발 야구', desc: `선발이 내려간 뒤 불펜진(${avgBp.toFixed(1)})이 흔들려 리드를 지키기 어렵습니다.`, color: '#f87171' }); 
            synergyBonus -= 2.5;
        } 

        else if (avgSp >= 83) {
            identityTags.push('🔥 안정적 선발 야구'); 
            synergyDetails.push({ tag: '🔥 안정적 선발 야구', desc: `선발진 평균 ${avgSp.toFixed(1)}의 든든한 이닝 소화력`, color: '#fb923c' }); 
            synergyBonus += 2.0;
        }


        if (avgBp >= 88 && avgSp < 75) {
            identityTags.push('🛡️ 숨막히는 벌떼 마운드'); 
            synergyDetails.push({ tag: '🛡️ 숨막히는 벌떼 마운드', desc: `불펜 평균 ${avgBp.toFixed(1)}의 철벽 물량 공세! 초반만 버티면 승리 보장`, color: '#0284c7' }); 
            synergyBonus += 4.5;
        } 

        else if (avgBp >= 85 && avgSp < 70) {
            identityTags.push('💧 선발 붕괴 & 불펜 과부하'); 
            synergyDetails.push({ tag: '💧 선발 붕괴 & 불펜 과부하', desc: `선발진(${avgSp.toFixed(1)})이 매번 조기 강판되어 불펜진이 궤멸 상태에 빠졌습니다!`, color: '#dc2626' }); 
            synergyBonus -= 4.5; // 🚨 치명적인 마이너스
        } else if (avgBp >= 82) {
            identityTags.push('🛡️ 탄탄한 불펜진'); 
            synergyDetails.push({ tag: '🛡️ 탄탄한 불펜진', desc: `불펜 평균 ${avgBp.toFixed(1)}의 안정적인 뒷문`, color: '#38bdf8' }); 
            synergyBonus += 2.0;
        }

        const isSpeedTeam = avgSpd >= 78; const isEliteSpeedTeam = avgSpd >= 86;
        if (isEliteSpeedTeam && eliteSpdCount < 5) { identityTags.push('🏃 슈퍼 육상부'); synergyDetails.push({ tag: '🏃 슈퍼 육상부', desc: '도루 +180%, 득점력 급상승', color: '#4ade80' }); synergyBonus += 6.5; }
        else if (isSpeedTeam && eliteSpdCount < 3) { identityTags.push('🏃 기동력 특화'); synergyDetails.push({ tag: '🏃 기동력 특화', desc: '도루 +120%, 득점 증가', color: '#4ade80' }); synergyBonus += 3.5; }

        const isPowerTeam = avgPow >= 82; const isElitePowerTeam = avgPow >= 89;
        if (isElitePowerTeam && elitePowCount < 5) { identityTags.push('💥 슈퍼 거포군단'); synergyDetails.push({ tag: '💥 슈퍼 거포군단', desc: '홈런 +200%, 타율 낮아도 장타로 무너뜨림', color: '#f87171' }); synergyBonus += 7.0; }
        else if (isPowerTeam && elitePowCount < 3) { identityTags.push('💥 장타 특화'); synergyDetails.push({ tag: '💥 장타 특화', desc: '홈런 +130%, 장타율 향상', color: '#f87171' }); synergyBonus += 4.0; }

        const isDefenseTeam = defense >= 82; const isEliteDefenseTeam = defense >= 89;
        if (isEliteDefenseTeam) { identityTags.push('🛡️ 철옹성 수비'); synergyDetails.push({ tag: '🛡️ 철옹성 수비', desc: 'ERA -1.2, 실책 거의 없음', color: '#38bdf8' }); synergyBonus += 7.5; }
        else if (isDefenseTeam) { identityTags.push('🛡️ 수비 특화'); synergyDetails.push({ tag: '🛡️ 수비 특화', desc: 'ERA -0.65, 팀 실점 감소', color: '#38bdf8' }); synergyBonus += 4.5; }

        const isContactTeam = avgCon >= 83; const isEliteContactTeam = avgCon >= 90;
        if (isEliteContactTeam) { identityTags.push('🎯 소몰이 학살'); synergyDetails.push({ tag: '🎯 소몰이 학살', desc: '타율 +.030, 안타 폭발', color: '#facc15' }); synergyBonus += 6.0; }
        else if (isContactTeam) { identityTags.push('🎯 컨택 특화'); synergyDetails.push({ tag: '🎯 컨택 특화', desc: '타율 +.015, 안타 기회 확대', color: '#facc15' }); synergyBonus += 3.8; }

        const isPitchingTeam = avgPitcherOvr >= 84 && avgPitcherCtrl >= 82; const isElitePitchingTeam = avgPitcherOvr >= 90 && avgPitcherCtrl >= 88;
        if (isElitePitchingTeam) { identityTags.push('👑 통곡의 마운드'); synergyDetails.push({ tag: '👑 통곡의 마운드', desc: '전 투수 ERA -1.5, 불펜도 동반 폭발', color: '#c084fc' }); synergyBonus += 8.0; }
        else if (isPitchingTeam) { identityTags.push('👑 투수 특화'); synergyDetails.push({ tag: '👑 투수 특화', desc: '전 투수 ERA -0.7, 마운드 안정', color: '#c084fc' }); synergyBonus += 4.2; }


        let defensePenalty = 0;
        if (defense < 72) {
            defensePenalty = (72 - defense) * 0.55; 
            synergyDetails.push({ tag: '⚠️ 수비 붕괴', desc: `평균 수비력 ${defense.toFixed(0)} — 실책 속출로 팀 ERA 폭등`, color: '#ef4444' });
        } else if (defense < 78) {
            defensePenalty = (78 - defense) * 0.30;
        } else {
            defensePenalty = -(defense - 78) * 0.20; 
        }

        const total = (pitching * 0.36) + (batting * 0.40) + (defense * 0.24) - defensePenalty + synergyBonus;

        return {
            total: this.clampNum(total, 40, 112),
            pitching, batting, defense,
            avgCon, avgPow, avgSpd,
            avgPitcherCtrl, avgPitcherSpd, avgPitcherOvr,
            identityTags,
            synergyDetails,
            synergies: {
                isSpeedTeam, isEliteSpeedTeam, isPowerTeam, isElitePowerTeam, isDefenseTeam, isEliteDefenseTeam, isContactTeam, isEliteContactTeam, isPitchingTeam, isElitePitchingTeam,
                hasAnchi, hasKimseon, nationalCount, nationalBonusFactor,
                traitorCount, eliteSpdCount, elitePowCount
            }
        };
    },

    resolveEvent(event, choiceIdx) {
        const choice = event.choices[choiceIdx];
        if (!choice) return null;
        if (choice.cost > 0 && choice.cost > GameState.earnedMoney) return { error: '적립금이 부족합니다.' };
        
        GameState.earnedMoney -= choice.cost;
        const isGood = Math.random() < choice.probGood;
        const effect = isGood ? choice.goodEffect : choice.badEffect;
        // 🌟 이벤트는 시즌당 최대 3번(각 구간 전환 시) 발생하는데, 매번 최고급 선택지를 고르면
        // 승률이 최대 +15%p 가까이 누적돼 로스터 실력 차이를 압도해버리는 문제가 있었다.
        // 시즌 내 누적 보너스를 ±8%p로 캡을 걸어 과도한 인플레이션을 막는다.
        const rawBonus = (GameState.eventWinRateBonus || 0) + effect;
        GameState.eventWinRateBonus = this.clampNum(rawBonus, -0.08, 0.08);

        const logEntry = { title: event.title, choiceLabel: choice.label, isGood, effect, msg: isGood ? choice.goodMsg : choice.badMsg };
        GameState.eventLogs.push(logEntry);
        GameState.completedEvents.add(event.targetStep);
        return logEntry;
    },

    applyEarnings(step) {
        const standings = this.getLeagueStandings(step.games);
        const myTeamRecord = standings.find(t => t.isMy);
        const myWins = myTeamRecord ? myTeamRecord.wins : Math.round(step.games * 0.5);
        const earn = Math.max(1, Math.round(myWins * 0.15 * 10) / 10);
        const actualEarn = Math.ceil(earn);
        this.applyEarningsWithLoanCheck(actualEarn);
        step._earnedThisStep = actualEarn;
        step._myWinsThisStep = myWins;
        UIController.updateStickyAndBoard();
    },

getNewsAndReportForCurrentStep() {
        const step = GameData.seasonSteps[GameState.currentStepIndex];
        const standings = this.getLeagueStandings(step.games);
        const myRank = standings.find(t => t.isMy).rank;
        const myPower = this.calculateMyTeamPower();
        const syn = myPower.synergies;
        const targetVNum = (GameState.totalChampionships || 12) + 1;
        const lines = [];


        if (syn.traitorCount >= 4) {
            lines.push(`⚠️ [내부 경고] 감독님... 선수단 내 파벌이 극에 달해 대화조차 끊겼습니다. 라커룸 분위기가 최악입니다.`);
        } else if (syn.traitorCount >= 2) {
            lines.push(`⚠️ [내부 주의] 이적/이탈 관련 앙금이 남은 선수들로 인해 라커룸 공기가 미묘하게 차갑습니다.`);
        }

        if (myPower.identityTags.includes('👵 노장 투혼과 체력 한계')) {
            lines.push(`👵 [체력 이슈] 베테랑 선수들의 체력 방전이 심각합니다. 경기 후반 경기력이 급격히 떨어지고 있습니다.`);
        }
        if (myPower.identityTags.includes('💸 빈부격차 라커룸')) {
            lines.push(`💸 [사기 저하] 고연봉자와 저연봉자 간의 극심한 격차로 인해 선수단 단합에 균열이 생기고 있습니다.`);
        }
        if (myPower.identityTags.includes('🤝 영혼의 키스톤')) {
            lines.push(`✨ [키스톤 콤비] 안치홍-김선빈 콤비의 명품 수비와 응집력이 팀 전체 타선과 수비 안정감을 견인 중입니다!`);
        }


        if (myPower.identityTags.includes('🔥 국동과 뱀직구')) {
            lines.push(`🔥 [전설의 마운드] 선동열-임창용 듀오가 뒷문을 꽉 잠그고 있습니다. 상대가 득점할 엄두를 내지 못합니다!`);
        }
        if (myPower.identityTags.includes('🐅 좌완 에이스 계보')) {
            lines.push(`🐅 [좌완 왕국] 양현종과 이의리, 신구 좌완 에이스가 번갈아 출격하며 선발진을 든든하게 지킵니다.`);
        }
        if (myPower.identityTags.includes('🔒 J-J-J 철벽 불펜')) {
            lines.push(`🔒 [철벽 불펜] 장현식-전상현-정해영 J-J-J 라인이 가동되었습니다! 6회 이후의 리드는 절대 뺏기지 않습니다.`);
        }


        if (myPower.identityTags.includes('💣 H-N 좌타 클린업')) {
            lines.push(`💣 [공포의 클린업] 최형우-나성범으로 이어지는 막강한 좌타 라인이 쉴 새 없이 상대 투수들을 폭격 중입니다!`);
        }
        if (myPower.identityTags.includes('⚡ 바람의 아들과 손자')) {
            lines.push(`⚡ [미친 기동력] 이종범과 김도영이 그라운드를 휩쓸고 있습니다! 출루만 하면 득점으로 연결되는 마법을 보여줍니다.`);
        }
        if (myPower.identityTags.includes('⚾ 클러치 듀오')) {
            lines.push(`⚾ [클러치 듀오] 최희섭-이범호 듀오가 주자가 있는 찬스마다 어김없이 해결사 본능을 폭발시키고 있습니다.`);
        }

        if (myPower.identityTags.includes('👑 완벽한 투수 왕국')) {
            lines.push(`🛡️ [마운드] 선발과 불펜 모두 리그 최정상입니다! 마운드의 힘으로 경기를 쉽게 지배하고 있습니다.`);
        } else if (myPower.identityTags.includes('🔥 선발 혹사 & 불펜 방화')) {
            lines.push(`🔥 [마운드 비상] 선발진은 완벽하지만, 불펜이 등판만 하면 불을 지르고 있습니다! 뒷문 보강이 시급합니다.`);
        } else if (myPower.identityTags.includes('💧 선발 붕괴 & 불펜 과부하')) {
            lines.push(`💧 [마운드 비상] 선발진이 조기 강판되면서 불펜 투수진에 극심한 과부하가 걸려있습니다.`);
        }

        if (myPower.identityTags.includes('🌋 핵타선 강림') || myPower.identityTags.includes('💥 슈퍼 거포군단')) {
            lines.push(`🌋 [타선] 화력이 막강합니다! 언제든 한 방으로 경기를 뒤집을 수 있는 공포의 라인업입니다.`);
        } else if (myPower.identityTags.includes('🌪️ 폭풍의 그라운드') || myPower.identityTags.includes('🏃 슈퍼 육상부')) {
            lines.push(`🌪️ [기동력] 미친 기동력으로 상대 배터리를 완벽히 흔들며 득점력을 올리고 있습니다.`);
        } else if (myPower.defense < 72) {
            lines.push(`⚠️ [수비 비상] 수비 실책이 속출하여 투수들의 방어율이 불필요하게 치솟고 있습니다.`);
        }


        switch (myRank) {
            case 1:
                lines.push(`🏆 [순위 총평] 현재 압도적인 1위입니다! 이 페이스만 유지한다면 V${targetVNum} 단독 우승은 확실시됩니다.`);
                break;
            case 2:
                lines.push(`🔥 [순위 총평] 선두와 턱밑 격차인 2위입니다! 조금만 더 피치를 올리면 1위 탈환도 가능합니다.`);
                break;
            case 3:
                lines.push(`📈 [순위 총평] 안정적인 3위권 유지 중입니다. 방심하지만 않는다면 가을야구 직행은 문제없습니다.`);
                break;
            case 4:
                lines.push(`⚾ [순위 총평] 포스트시즌권인 4위입니다. 승차를 조금 더 벌려 확실한 상위권으로 치고 나아가야 합니다.`);
                break;
            case 5:
                lines.push(`⚠️ [순위 총평] 가을야구 턱걸이인 5위입니다. 추격하는 팀들의 기세가 거세 매 경기가 살얼음판입니다.`);
                break;
            case 6:
                lines.push(`🥊 [순위 총평] 5위 추격 중인 6위입니다. 조금만 집중력을 발휘하면 5위권 진입이 충분히 가능합니다!`);
                break;
            case 7:
                lines.push(`📉 [순위 총평] 중하위권인 7위로 밀려났습니다. 분위기 반전을 위해 약점 포지션 결단이 필요합니다.`);
                break;
            case 8:
                lines.push(`🚨 [순위 총평] 8위까지 하락했습니다. 연승을 발판 삼기 위한 과감한 라인업 재편성이 절실합니다.`);
                break;
            case 9:
                lines.push(`📉 [순위 총평] 9위로 팀 사기가 많이 떨어져 있습니다. 주전 체력 안배와 전력 재정비가 시급합니다.`);
                break;
            case 10:
                lines.push(`💥 [순위 총평] 최하위인 10위에 머물고 있습니다... 꼴찌 탈출을 위한 특단의 대책이 없으면 위험합니다!`);
                break;
            default:
                lines.push(`📢 [순위 총평] 성적이 많이 처집니다. 과감한 변화와 선수 교체가 절실합니다!`);
                break;
        }


        const coachMsg = lines.join('\n\n');

        return { coachMsg, myRank, myPower };
    },
    getIdentityKey(type, idx) { return idx === undefined ? type : `${type}${idx}`; },

    /**
     * 🌟 시즌 최종 순위에 따른 결과 판정
     * 1위: 파격 지원금 / 2~4위: 지원금 / 5위: 소폭 지원 / 6위: 경고(유임) / 7위 이하: 경질(게임 오버)
     */
    getSeasonOutcome(rank) {
        if (rank === 1) {
            return { tier: 'CHAMPION', bonus: 20, fired: false,
                label: '🏆 극찬받은 시즌',
                msg: '구단주가 파격적인 전력 보강 예산을 승인했습니다! 다음 시즌을 더 강하게 준비할 수 있습니다.' };
        }
        if (rank >= 2 && rank <= 4) {
            return { tier: 'GOOD', bonus: 10, fired: false,
                label: '👍 만족스러운 시즌',
                msg: '준수한 성적에 구단이 만족하며 전력 보강 자금을 지원합니다.' };
        }
        if (rank === 5) {
            return { tier: 'AVERAGE', bonus: 5, fired: false,
                label: '📊 평범한 시즌',
                msg: '나쁘지 않은 성적입니다. 소폭의 지원금이 지급됩니다.' };
        }
        if (rank === 6) {
            return { tier: 'WARNING', bonus: 0, fired: false,
                label: '⚠️ 경고받은 시즌',
                msg: '아쉬운 성적... 구단주가 마지막 기회를 주기로 했습니다. 추가 지원금은 없습니다. 다음 시즌은 반드시 반등해야 합니다!' };
        }
        return { tier: 'FIRED', bonus: 0, fired: true,
            label: '💥 경질',
            msg: '실망스러운 성적으로 감독직에서 전격 경질되었습니다...' };
    },

    /**
     * 🌟 커리어(다중 시즌) 최종 평가 — 시즌 평균 순위를 기준으로 등급/코멘트 산출
     */
    getCareerGrade(careerLog) {
        if (!careerLog || careerLog.length === 0) {
            return { grade: '-', comment: '기록이 없습니다.', avgRank: 0 };
        }
        const avgRank = careerLog.reduce((s, l) => s + l.rank, 0) / careerLog.length;
        const champCount = careerLog.filter(l => l.rank === 1).length;

        let grade, comment;
        if (avgRank <= 1.5) {
            grade = '레전드 (S+)';
            comment = `평균 순위 ${avgRank.toFixed(1)}위, 우승 ${champCount}회! 왕조를 건설한 최고의 명장으로 구단 역사에 이름을 남겼습니다.`;
        } else if (avgRank <= 2.5) {
            grade = '명장 (S)';
            comment = `평균 순위 ${avgRank.toFixed(1)}위. 꾸준히 상위권을 지켜낸 안정감 있는 지도력을 보여주었습니다.`;
        } else if (avgRank <= 4.0) {
            grade = '준수한 감독 (A)';
            comment = `평균 순위 ${avgRank.toFixed(1)}위. 매 시즌 가을야구 경쟁을 이끈 준수한 성적표입니다.`;
        } else if (avgRank <= 5.5) {
            grade = '무난한 감독 (B)';
            comment = `평균 순위 ${avgRank.toFixed(1)}위. 큰 임팩트는 없었지만 팀을 안정적으로 이끌었습니다.`;
        } else {
            grade = '분발 필요 (C)';
            comment = `평균 순위 ${avgRank.toFixed(1)}위. 굴곡이 많았던 커리어였지만 끝까지 감독직을 지켜냈다는 점은 인정받을 만합니다.`;
        }
        return { grade, comment, avgRank };
    },

    /**
     * 개별 선수 스탯 시뮬레이션 (마이너스 패널티 반영)
     */
    computeStatFor(type, idx, step) {
        const player = GameState.getCurrentPlayer(type, idx);
        if (!player) return { line: '기록 없음', grade: 'D' };

        const identity = this.getIdentityKey(type, idx);
        const cacheKey = `${GameState.currentStepIndex}:${identity}:${player.name}`;
        if (GameState.statCache[cacheKey]) return GameState.statCache[cacheKey];


        if (!player._seasonVariance) {
            player._seasonVariance = 0.85 + (Math.random() * 0.30); // 0.85 ~ 1.15 사이의 개인별 시즌 기복 (±15%, 선수마다 고정)
        }
        // 🌟 이전에는 identity.length(예: 'sp0'~'sp4' 모두 길이 3)만 시드에 반영되어
        // 같은 포지션군의 선수들이 사실상 동일한 난수를 공유, 성적이 서로 판박이처럼 나오는 버그가 있었다.
        // 이름까지 포함한 해시로 완전히 개별화한다.
        const seedVal = GameState.currentStepIndex * 811 + (this.hashStr(identity + '|' + player.name) % 97331) + this.randomSalt;
        const randA = this.pseudoRandom(seedVal, 1.33);
        const randB = this.pseudoRandom(seedVal, 2.66);
        const randC = this.pseudoRandom(seedVal, 3.99);
        const sv = player._seasonVariance;

        const joinedStep = player.joinedStep || 0;
        let pastGames = 0;
        if (joinedStep > 0) pastGames = GameData.seasonSteps[joinedStep - 1]?.games || 0;
        const activeGames = Math.max(0, step.games - pastGames);
        const gamesFactor = activeGames / 144;

        const standings = this.getLeagueStandings(step.games);
        const myTeamRecord = standings.find(t => t.isMy);
        const activeTeamWins = Math.round((myTeamRecord ? myTeamRecord.wins : step.games * 0.5) * (activeGames / step.games));
        const activeTeamLosses = Math.round((myTeamRecord ? myTeamRecord.losses : step.games * 0.5) * (activeGames / step.games));
        const teamWinPct = (activeTeamWins + activeTeamLosses) > 0 ? activeTeamWins / (activeTeamWins + activeTeamLosses) : 0.5;

        const teamPower = this.calculateMyTeamPower();
        const syn = teamPower.synergies || {};

        let result;

        if (player.isPitcher) {
            const controlFactor = (player.ctrl - 68) * 0.068 * sv;
            const stuffFactor   = (player.spd  - 68) * 0.042 * sv;
            const mentalFactor  = (player.mtl  - 68) * 0.032 * sv;
            const staminaFactor = (player.stm  - 68) * 0.018 * sv;
            // 팀 성적과의 싱크: 팀 승률이 좋을수록(수비/타선 지원) 개인 방어율도 함께 좋아지도록 소폭 연동
            const teamSyncEra = (teamWinPct - 0.5) * -1.1;

            let defSynergyEra = 0;
            if (syn.isEliteDefenseTeam) defSynergyEra = 1.20;
            else if (syn.isDefenseTeam)  defSynergyEra = 0.65;
            else if (teamPower.defense < 72) defSynergyEra = -0.80;
            else if (teamPower.defense < 78) defSynergyEra = -0.35;

            if (syn.hasAnchi && syn.hasKimseon) defSynergyEra += 0.30;
            defSynergyEra += (syn.nationalBonusFactor || 0) * 0.35;


            if (syn.traitorCount >= 4) defSynergyEra -= 1.20;
            else if (syn.traitorCount >= 2) defSynergyEra -= 0.40;

            let pitchSynEra = 0;
            if (syn.isElitePitchingTeam) pitchSynEra = 0.80;
            else if (syn.isPitchingTeam)  pitchSynEra = 0.40;

            const baseEra = 4.80 - controlFactor - stuffFactor - mentalFactor - staminaFactor - defSynergyEra - pitchSynEra + teamSyncEra + (randA - 0.5) * 1.8;
            const era = this.clampNum(baseEra, 0.70, 9.50);

            let soBonus = 0;
            if (syn.eliteSpdCount >= 3) soBonus += 5;

            const strikeouts = Math.round(((player.spd * 2.4 + player.ctrl * 0.6 + soBonus + (randB * 28)) * sv) * gamesFactor);

            let recordLine = '';
            if (type === 'sp') {
                const spStarts = activeGames / 5;
                const pitcherPowerFactor = (player.ovr - 72) * 0.022 + (4.20 - era) * 0.16;
                const pitcherWinPct = this.clampNum(teamWinPct + pitcherPowerFactor + (randC - 0.5) * 0.22, 0.08, 0.92);
                const decisions = spStarts * (0.42 + randA * 0.28);
                const pWins   = Math.max(0, Math.round(decisions * pitcherWinPct));
                const pLosses = Math.max(0, Math.round(decisions * (1 - pitcherWinPct)));
                recordLine = `${pWins}승 ${pLosses}패 | `;
            } else if (type === 'cp') {
                const maxPossibleSv = Math.round(activeTeamWins * 0.70);
                const svFactor = this.clampNum((9.0 - era) / 6.5 * (player.ovr / 84), 0.22, 1.0);
                const saves = Math.min(Math.max(0, Math.round(maxPossibleSv * svFactor * (0.76 + randA * 0.36))), activeTeamWins);
                recordLine = `세이브 ${saves}개 | `;
            } else {
                let holdBase = (player.ovr - 64) * 0.38 + (randA * 17);
                if (syn.isPitchingTeam) holdBase *= 1.3;
                const holds = Math.max(0, Math.round(holdBase * gamesFactor));
                recordLine = `${holds}홀드 | `;
            }

            let grade = 'C';
            if      (era <= 2.20 && player.ovr >= 86) grade = 'S';
            else if (era <= 3.10)  grade = 'A';
            else if (era <= 4.10)  grade = 'B';
            else if (era <= 5.20)  grade = 'C';
            else if (era <= 6.30)  grade = 'D';
            else grade = 'F';

            result = { line: `${recordLine}ERA ${era.toFixed(2)} | 삼진 ${strikeouts}개`, grade };

        } else {
            let contactBonus = 0;
            if (syn.isEliteContactTeam) contactBonus = 0.030;
            else if (syn.isContactTeam) contactBonus = 0.015;
            if (syn.isElitePowerTeam)   contactBonus -= 0.018;
            else if (syn.isPowerTeam)   contactBonus -= 0.008;
            if (syn.hasAnchi && syn.hasKimseon) contactBonus += 0.015;
            contactBonus += (syn.nationalBonusFactor || 0) * 0.012; 

            if (syn.traitorCount >= 4) contactBonus -= 0.045;
            else if (syn.traitorCount >= 2) contactBonus -= 0.015;

            // 팀 성적과의 싱크: 팀 승률이 좋을수록(전체적인 타선/수비 지원) 개인 타율도 함께 소폭 상승
            const teamSyncAvg = (teamWinPct - 0.5) * 0.028;

            const battingAvg = this.clampNum(
                0.175 + (player.con - 60) * 0.0045 * sv + contactBonus + teamSyncAvg + (randA - 0.5) * 0.052,
                0.155, 0.415
            );

            const powFactor = Math.pow(player.pow / 70, 1.7);
            let powerSynergyHr = 1.0;
            if (syn.elitePowCount >= 5) powerSynergyHr = 1.80;
            else if (syn.elitePowCount >= 3) powerSynergyHr = 1.40;
            else if (syn.isElitePowerTeam) powerSynergyHr = 1.70;
            else if (syn.isPowerTeam) powerSynergyHr = 1.35;
            
            const hr = Math.max(0, Math.round((((player.pow - 52) * 0.55 * powFactor * powerSynergyHr * sv) + (randB * 5)) * gamesFactor));

            let speedSynergySb = 1.0;
            if (syn.eliteSpdCount >= 5) speedSynergySb = 2.40;
            else if (syn.eliteSpdCount >= 3) speedSynergySb = 1.70;
            else if (syn.isEliteSpeedTeam) speedSynergySb = 2.20;
            else if (syn.isSpeedTeam) speedSynergySb = 1.55;

            const sb = Math.max(0, Math.round((((player.spd - 52) * 0.52 * speedSynergySb * sv) + (randC * 7)) * gamesFactor));

            let specialStatHtml = '';
            if (type === 'dh') {
                specialStatHtml = `<span style="color:#38bdf8;">지명타자</span>`;
            } else if (player.def < 70 || syn.traitorCount >= 4) { 
                let errorMult = syn.isEliteDefenseTeam ? 0.15 : (syn.isDefenseTeam ? 0.30 : 0.75);
                if (syn.hasAnchi && syn.hasKimseon) errorMult *= 0.5;
                errorMult *= (1 - (syn.nationalBonusFactor || 0) * 0.3);
                
                if (syn.traitorCount >= 4) errorMult *= 2.5;

                const baseDef = (player.def < 70) ? player.def : 70;
                const errors = Math.max(1, Math.round((74 - baseDef) * errorMult + randA * 5) * gamesFactor);
                specialStatHtml = `<span style="color:#f87171;">실책 ${Math.round(errors)}개 ⚠️</span>`;
            } else if (player.def >= 89) {
                specialStatHtml = `<span style="color:#4ade80;">철벽수비 ✨</span>`;
            } else if (player.def >= 82) {
                specialStatHtml = `<span style="color:#a78bfa;">안정적 수비</span>`;
            } else {
                specialStatHtml = `<span style="color:#94a3b8;">평균 수비</span>`;
            }

            let grade = 'C';
            if      (battingAvg >= 0.330 && player.ovr >= 87) grade = 'S';
            else if (battingAvg >= 0.305)  grade = 'A';
            else if (battingAvg >= 0.272)  grade = 'B';
            else if (battingAvg >= 0.240)  grade = 'C';
            else if (battingAvg >= 0.208)  grade = 'D';
            else grade = 'F';

            result = {
                line: `타율 ${battingAvg.toFixed(3)} | 홈런 ${hr}개 | 도루 ${sb}개 | ${specialStatHtml}`,
                grade
            };
        }

        GameState.statCache[cacheKey] = result;
        return result;
    }
};
