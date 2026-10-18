/**
 * 班級美食調查局 (31人座號) - 核心應用程式邏輯
 */

(function () {
  'use strict';

  const TOTAL_SEATS = 31;
  const STORAGE_KEY = 'class_food_survey_seats_31';
  const THEME_KEY = 'class_food_survey_theme';

  // 狀態管理
  let seatsData = [];
  let currentFilter = 'all';
  let searchQuery = '';
  let wheelFoods = [];
  let isSpinning = false;
  let currentWheelAngle = 0;

  // DOM 元素快取
  const seatsGridContainer = document.getElementById('seatsGridContainer');
  const progressBarFill = document.getElementById('progressBarFill');
  const progressPercent = document.getElementById('progressPercent');
  const filledCountEl = document.getElementById('filledCount');
  const unfilledCountEl = document.getElementById('unfilledCount');
  const topFoodNameEl = document.getElementById('topFoodName');
  const chipFilledEl = document.getElementById('chipFilled');
  const chipUnfilledEl = document.getElementById('chipUnfilled');
  const searchInput = document.getElementById('searchInput');
  const clearSearchBtn = document.getElementById('clearSearchBtn');

  // 彈窗相關
  const entryModal = document.getElementById('entryModal');
  const modalTitle = document.getElementById('modalTitle');
  const modalSeatNumber = document.getElementById('modalSeatNumber');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const cancelModalBtn = document.getElementById('cancelModalBtn');
  const seatForm = document.getElementById('seatForm');
  const formSeatNumber = document.getElementById('formSeatNumber');
  const seatSelector = document.getElementById('seatSelector');
  const studentNameInput = document.getElementById('studentName');
  const favoriteFoodInput = document.getElementById('favoriteFood');
  const restaurantNoteInput = document.getElementById('restaurantNote');
  const clearSeatBtn = document.getElementById('clearSeatBtn');
  const foodQuickTags = document.getElementById('foodQuickTags');

  // LINE 分享彈窗
  const lineShareModal = document.getElementById('lineShareModal');
  const lineShareText = document.getElementById('lineShareText');
  const closeLineModalBtn = document.getElementById('closeLineModalBtn');
  const cancelLineModalBtn = document.getElementById('cancelLineModalBtn');
  const confirmCopyLineBtn = document.getElementById('confirmCopyLineBtn');

  // 手機連線彈窗
  const mobileQrBtn = document.getElementById('mobileQrBtn');
  const mobileQrModal = document.getElementById('mobileQrModal');
  const closeQrModalBtn = document.getElementById('closeQrModalBtn');
  const cancelQrModalBtn = document.getElementById('cancelQrModalBtn');
  const copyMobileUrlBtn = document.getElementById('copyMobileUrlBtn');
  const mobileUrlDisplay = document.getElementById('mobileUrlDisplay');
  const qrCodeImage = document.getElementById('qrCodeImage');

  // 統計與推薦容器
  const foodRankingsContainer = document.getElementById('foodRankingsContainer');
  const dietaryRestrictionsContainer = document.getElementById('dietaryRestrictionsContainer');
  const recommendationsList = document.getElementById('recommendationsList');

  // 幸運輪盤
  const wheelCanvas = document.getElementById('wheelCanvas');
  const spinWheelBtn = document.getElementById('spinWheelBtn');
  const wheelResult = document.getElementById('wheelResult');
  const wheelResultText = document.getElementById('wheelResultText');

  // 按鈕與切換
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const quickFillSampleBtn = document.getElementById('quickFillSampleBtn');
  const exportCsvBtn = document.getElementById('exportCsvBtn');
  const copyLineBtn = document.getElementById('copyLineBtn');
  const resetAllDataBtn = document.getElementById('resetAllDataBtn');
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toastMessage');

  // ==========================================
  // 初始化資料
  // ==========================================
  function initData() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === TOTAL_SEATS) {
          seatsData = parsed;
          return;
        }
      } catch (e) {
        console.error('Failed to parse saved seats data', e);
      }
    }

    // 初始化 1 ~ 31 號的空資料
    seatsData = [];
    for (let i = 1; i <= TOTAL_SEATS; i++) {
      seatsData.push({
        seatNumber: i,
        studentName: '',
        favoriteFood: '',
        dietRestrictions: [],
        restaurantNote: '',
        updatedAt: null
      });
    }
    saveData();
  }

  function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seatsData));
  }

  // ==========================================
  // 介面渲染
  // ==========================================
  function renderAll() {
    renderStats();
    renderSeatsGrid();
    renderAnalytics();
    initWheelData();
    drawWheel();
  }

  // 1. 頂部進度條與統計
  function renderStats() {
    const filledCount = seatsData.filter(s => s.favoriteFood.trim() !== '').length;
    const unfilledCount = TOTAL_SEATS - filledCount;
    const percentage = Math.round((filledCount / TOTAL_SEATS) * 100);

    progressBarFill.style.width = `${percentage}%`;
    progressPercent.textContent = `${percentage}%`;
    filledCountEl.textContent = filledCount;
    unfilledCountEl.textContent = unfilledCount;
    chipFilledEl.textContent = filledCount;
    chipUnfilledEl.textContent = unfilledCount;

    // 計算第一名熱門食物
    const foodCounts = getFoodCounts();
    if (foodCounts.length > 0) {
      topFoodNameEl.textContent = `${foodCounts[0].name} (${foodCounts[0].count}票)`;
    } else {
      topFoodNameEl.textContent = '尚待填寫';
    }
  }

  // 2. 渲染 31 個座號的卡片網格
  function renderSeatsGrid() {
    seatsGridContainer.innerHTML = '';

    // 篩選與搜尋處理
    const filteredSeats = seatsData.filter(seat => {
      const isFilled = seat.favoriteFood.trim() !== '';
      if (currentFilter === 'filled' && !isFilled) return false;
      if (currentFilter === 'unfilled' && isFilled) return false;

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const seatNoStr = seat.seatNumber.toString();
        const nameMatch = (seat.studentName || '').toLowerCase().includes(q);
        const foodMatch = (seat.favoriteFood || '').toLowerCase().includes(q);
        const noteMatch = (seat.restaurantNote || '').toLowerCase().includes(q);
        const dietMatch = (seat.dietRestrictions || []).some(d => d.toLowerCase().includes(q));

        if (!seatNoStr.includes(q) && !nameMatch && !foodMatch && !noteMatch && !dietMatch) {
          return false;
        }
      }
      return true;
    });

    if (filteredSeats.length === 0) {
      seatsGridContainer.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 3rem 1rem; color: var(--text-muted);">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🔍</div>
          <p>沒有符合條件的座號紀錄</p>
          <button class="btn btn-secondary btn-sm" style="margin-top: 0.8rem;" onclick="document.getElementById('clearSearchBtn').click()">清除搜尋條件</button>
        </div>
      `;
      return;
    }

    filteredSeats.forEach(seat => {
      const isFilled = seat.favoriteFood.trim() !== '';
      const card = document.createElement('div');
      card.className = `seat-card ${isFilled ? 'is-filled' : 'is-empty'}`;
      card.setAttribute('data-seat', seat.seatNumber);

      const seatDisplayNum = seat.seatNumber.toString().padStart(2, '0');

      let bodyContent = '';
      if (isFilled) {
        const studentDisplayName = seat.studentName ? `👤 ${escapeHtml(seat.studentName)}` : `同學 (未填名字)`;
        const dietChipsHtml = (seat.dietRestrictions && seat.dietRestrictions.length > 0)
          ? `<div class="seat-diet-chips">${seat.dietRestrictions.map(d => `<span class="diet-chip">${escapeHtml(d)}</span>`).join('')}</div>`
          : '';
        const recNoteHtml = seat.restaurantNote ? `<div style="font-size: 0.76rem; color: var(--text-muted); margin-top: 0.25rem;">📍 推薦：${escapeHtml(seat.restaurantNote)}</div>` : '';

        bodyContent = `
          <div class="seat-student-name">${studentDisplayName}</div>
          <div class="seat-food-text">🍽️ ${escapeHtml(seat.favoriteFood)}</div>
          ${recNoteHtml}
          ${dietChipsHtml}
        `;
      } else {
        bodyContent = `
          <div class="seat-empty-prompt">
            <span>➕ 點擊填寫美食喜好</span>
          </div>
        `;
      }

      card.innerHTML = `
        <div>
          <div class="seat-card-header">
            <span class="seat-number-badge">
              <span>#</span>${seatDisplayNum} 號
            </span>
            <span class="seat-status-tag ${isFilled ? 'tag-filled' : 'tag-empty'}">
              ${isFilled ? '已填寫' : '待填寫'}
            </span>
          </div>
          ${bodyContent}
        </div>
        <div class="seat-footer-action">
          <span>${isFilled ? '✏️ 點擊修改' : '✍️ 立即填寫'}</span>
        </div>
      `;

      card.addEventListener('click', () => {
        openEntryModal(seat.seatNumber);
      });

      seatsGridContainer.appendChild(card);
    });
  }

  // 3. 渲染統計排行榜與飲食禁忌
  function renderAnalytics() {
    const foodCounts = getFoodCounts();

    // 渲染美食排行榜 Top 10
    if (foodCounts.length === 0) {
      foodRankingsContainer.innerHTML = `<div class="empty-hint" style="text-align: center; padding: 2rem;">尚無填寫資料，快去填寫卡片吧！</div>`;
    } else {
      const maxVotes = foodCounts[0].count;
      foodRankingsContainer.innerHTML = foodCounts.slice(0, 10).map((item, idx) => {
        const percent = Math.round((item.count / maxVotes) * 100);
        const rankClass = idx === 0 ? 'rank-1' : (idx === 1 ? 'rank-2' : (idx === 2 ? 'rank-3' : ''));
        const votersSeats = item.seats.map(s => `${s}號`).join('、');

        return `
          <div class="ranking-item ${rankClass}">
            <div class="ranking-item-top">
              <div style="display: flex; align-items: center;">
                <span class="ranking-rank">${idx + 1}</span>
                <span class="ranking-food-name">${escapeHtml(item.name)}</span>
              </div>
              <span class="ranking-votes">${item.count} 票</span>
            </div>
            <div class="ranking-bar-bg">
              <div class="ranking-bar-fill" style="width: ${percent}%;"></div>
            </div>
            <div class="ranking-voters">支持座號：${votersSeats}</div>
          </div>
        `;
      }).join('');
    }

    // 渲染飲食禁忌統計
    const dietSummary = {
      '素食(全素/蛋奶素)': { label: '🥦 素食需求', seats: [] },
      '不吃牛': { label: '🚫 不吃牛肉', seats: [] },
      '不吃豬': { label: '🚫 不吃豬肉', seats: [] },
      '不吃辣': { label: '🌶️ 不吃辣', seats: [] },
      '海鮮過敏': { label: '🦐 海鮮過敏', seats: [] },
      '甲殼/花生過敏': { label: '🥜 特殊過敏', seats: [] }
    };

    seatsData.forEach(seat => {
      if (seat.dietRestrictions && seat.dietRestrictions.length > 0) {
        seat.dietRestrictions.forEach(diet => {
          if (dietSummary[diet]) {
            dietSummary[diet].seats.push(seat.seatNumber);
          }
        });
      }
    });

    dietaryRestrictionsContainer.innerHTML = Object.keys(dietSummary).map(key => {
      const item = dietSummary[key];
      const count = item.seats.length;
      return `
        <div class="dietary-stat-box">
          <div class="count">${count}</div>
          <div class="label">${item.label}</div>
          <div class="voters">${count > 0 ? item.seats.map(s => `${s}號`).join('、') : '無'}</div>
        </div>
      `;
    }).join('');

    // 推薦口袋名單
    const recommendations = [];
    seatsData.forEach(s => {
      if (s.restaurantNote && s.restaurantNote.trim() !== '') {
        recommendations.push({
          seat: s.seatNumber,
          name: s.studentName || `${s.seatNumber}號`,
          note: s.restaurantNote.trim()
        });
      }
    });

    if (recommendations.length === 0) {
      recommendationsList.innerHTML = `<span class="empty-hint">尚無同學提供推薦店家</span>`;
    } else {
      recommendationsList.innerHTML = recommendations.map(r => `
        <div class="rec-chip">
          <strong>[${r.seat}號 ${escapeHtml(r.name)}]</strong>: ${escapeHtml(r.note)}
        </div>
      `).join('');
    }
  }

  // 輔助函式：計算食物得票統計
  function getFoodCounts() {
    const counts = {};
    const seatsMap = {};

    seatsData.forEach(seat => {
      if (!seat.favoriteFood || seat.favoriteFood.trim() === '') return;

      // 支援多種食物用逗號、頓號或斜線隔開
      const foods = seat.favoriteFood
        .split(/[,，、/／\s+]+/)
        .map(f => f.trim())
        .filter(f => f.length > 0);

      foods.forEach(food => {
        counts[food] = (counts[food] || 0) + 1;
        if (!seatsMap[food]) seatsMap[food] = [];
        seatsMap[food].push(seat.seatNumber);
      });
    });

    const result = Object.keys(counts).map(food => ({
      name: food,
      count: counts[food],
      seats: seatsMap[food]
    }));

    result.sort((a, b) => b.count - a.count);
    return result;
  }

  // ==========================================
  // 彈窗表單邏輯
  // ==========================================
  function setupSeatSelector() {
    seatSelector.innerHTML = '';
    for (let i = 1; i <= TOTAL_SEATS; i++) {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = `座號 ${i} 號 ${seatsData[i - 1]?.studentName ? `(${seatsData[i - 1].studentName})` : ''}`;
      seatSelector.appendChild(opt);
    }
  }

  function openEntryModal(seatNumber) {
    setupSeatSelector();
    const seat = seatsData[seatNumber - 1];
    if (!seat) return;

    formSeatNumber.value = seatNumber;
    seatSelector.value = seatNumber;
    modalSeatNumber.textContent = seatNumber;
    modalTitle.textContent = `填寫座號 ${seatNumber} 號 美食喜好`;

    studentNameInput.value = seat.studentName || '';
    favoriteFoodInput.value = seat.favoriteFood || '';
    restaurantNoteInput.value = seat.restaurantNote || '';

    // 重設勾選框
    const checkboxes = seatForm.querySelectorAll('input[name="diet"]');
    checkboxes.forEach(cb => {
      cb.checked = (seat.dietRestrictions || []).includes(cb.value);
    });

    entryModal.classList.add('is-open');
    favoriteFoodInput.focus();
  }

  function closeEntryModal() {
    entryModal.classList.remove('is-open');
  }

  // 表單切換座號
  seatSelector.addEventListener('change', (e) => {
    const targetSeat = parseInt(e.target.value, 10);
    openEntryModal(targetSeat);
  });

  // 快速點選標籤
  foodQuickTags.addEventListener('click', (e) => {
    const btn = e.target.closest('.tag-btn');
    if (!btn) return;
    const food = btn.getAttribute('data-food');
    if (!food) return;

    const currentVal = favoriteFoodInput.value.trim();
    if (!currentVal) {
      favoriteFoodInput.value = food;
    } else {
      // 避免重複加入
      if (!currentVal.includes(food)) {
        favoriteFoodInput.value = `${currentVal}、${food}`;
      }
    }
    favoriteFoodInput.focus();
  });

  // 儲存表單
  seatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const seatNum = parseInt(formSeatNumber.value, 10);
    const seatIdx = seatNum - 1;

    const selectedDiets = [];
    const checkboxes = seatForm.querySelectorAll('input[name="diet"]:checked');
    checkboxes.forEach(cb => selectedDiets.push(cb.value));

    seatsData[seatIdx] = {
      seatNumber: seatNum,
      studentName: studentNameInput.value.trim(),
      favoriteFood: favoriteFoodInput.value.trim(),
      dietRestrictions: selectedDiets,
      restaurantNote: restaurantNoteInput.value.trim(),
      updatedAt: new Date().toISOString()
    };

    saveData();
    closeEntryModal();
    renderAll();
    showToast(`✅ 已成功儲存座號 ${seatNum} 號的喜好！`);
  });

  // 清空此座號
  clearSeatBtn.addEventListener('click', () => {
    const seatNum = parseInt(formSeatNumber.value, 10);
    if (confirm(`確定要清空座號 ${seatNum} 號的所有填寫資料嗎？`)) {
      seatsData[seatNum - 1] = {
        seatNumber: seatNum,
        studentName: '',
        favoriteFood: '',
        dietRestrictions: [],
        restaurantNote: '',
        updatedAt: null
      };
      saveData();
      closeEntryModal();
      renderAll();
      showToast(`🗑️ 已清空座號 ${seatNum} 號的資料`);
    }
  });

  closeModalBtn.addEventListener('click', closeEntryModal);
  cancelModalBtn.addEventListener('click', closeEntryModal);
  entryModal.addEventListener('click', (e) => {
    if (e.target === entryModal) closeEntryModal();
  });

  // ==========================================
  // 工具列：分頁、篩選與搜尋
  // ==========================================
  // 標籤切換
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      const targetId = btn.getAttribute('data-tab');
      document.getElementById(targetId).classList.add('active');

      if (targetId === 'wheel-view') {
        drawWheel();
      }
    });
  });

  // 篩選 Chip
  document.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentFilter = chip.getAttribute('data-filter');
      renderSeatsGrid();
    });
  });

  // 搜尋關鍵字
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.trim();
    clearSearchBtn.style.display = searchQuery ? 'block' : 'none';
    renderSeatsGrid();
  });

  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchQuery = '';
    clearSearchBtn.style.display = 'none';
    renderSeatsGrid();
  });

  // ==========================================
  // 手機連線與 QR Code 功能
  // ==========================================
  function getMobileConnectionUrl() {
    const port = window.location.port || '8080';
    const host = window.location.hostname;
    // 若在本地電腦開啟 (localhost 或 127.0.0.1)，則提供區域網路 IP (192.168.1.120) 給手機連線
    if (host === 'localhost' || host === '127.0.0.1' || host === '') {
      return `http://192.168.1.120:${port}`;
    }
    return window.location.origin;
  }

  function openMobileQrModal() {
    const url = getMobileConnectionUrl();
    if (mobileUrlDisplay) {
      mobileUrlDisplay.textContent = url;
    }
    if (qrCodeImage) {
      // 使用穩定的 QR Code 產生服務直接轉成圖片
      const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=8&data=${encodeURIComponent(url)}`;
      qrCodeImage.src = qrApiUrl;
    }
    if (mobileQrModal) {
      mobileQrModal.classList.add('is-open');
    }
  }

  if (mobileQrBtn) {
    mobileQrBtn.addEventListener('click', openMobileQrModal);
  }
  if (closeQrModalBtn) {
    closeQrModalBtn.addEventListener('click', () => mobileQrModal.classList.remove('is-open'));
  }
  if (cancelQrModalBtn) {
    cancelQrModalBtn.addEventListener('click', () => mobileQrModal.classList.remove('is-open'));
  }
  if (mobileQrModal) {
    mobileQrModal.addEventListener('click', (e) => {
      if (e.target === mobileQrModal) mobileQrModal.classList.remove('is-open');
    });
  }
  if (copyMobileUrlBtn) {
    copyMobileUrlBtn.addEventListener('click', () => {
      const url = getMobileConnectionUrl();
      navigator.clipboard.writeText(url).then(() => {
        showToast(`📋 已複製手機連線網址：${url}`);
        mobileQrModal.classList.remove('is-open');
      }).catch(() => {
        showToast(`手機網址：${url}`);
      });
    });
  }

  // ==========================================
  // LINE 分享與 CSV 匯出
  // ==========================================
  copyLineBtn.addEventListener('click', () => {
    generateLineShareText();
    lineShareModal.classList.add('is-open');
  });

  function generateLineShareText() {
    const filledSeats = seatsData.filter(s => s.favoriteFood.trim() !== '');
    const foodCounts = getFoodCounts();

    let text = `🍽️【全班 31 人聚餐美食調查統計】🍽️\n`;
    text += `📊 目前進度：${filledSeats.length} / ${TOTAL_SEATS} 人 (${Math.round((filledSeats.length / TOTAL_SEATS) * 100)}%)\n\n`;

    if (foodCounts.length > 0) {
      text += `🔥 人氣美食排行榜 Top 5：\n`;
      foodCounts.slice(0, 5).forEach((item, idx) => {
        text += `  ${idx + 1}. ${item.name} (${item.count}票)\n`;
      });
      text += `\n`;
    }

    // 忌口摘要
    const dietMap = {};
    seatsData.forEach(s => {
      (s.dietRestrictions || []).forEach(d => {
        if (!dietMap[d]) dietMap[d] = [];
        dietMap[d].push(s.seatNumber);
      });
    });

    const dietKeys = Object.keys(dietMap);
    if (dietKeys.length > 0) {
      text += `⚠️ 餐廳訂位忌口備忘：\n`;
      dietKeys.forEach(k => {
        text += `  • ${k} (${dietMap[k].length}人)：座號 ${dietMap[k].join('、')}\n`;
      });
      text += `\n`;
    }

    text += `📋 各座號填寫清單：\n`;
    seatsData.forEach(s => {
      const num = s.seatNumber.toString().padStart(2, '0');
      if (s.favoriteFood) {
        const namePart = s.studentName ? `[${s.studentName}] ` : '';
        const dietPart = s.dietRestrictions && s.dietRestrictions.length > 0 ? ` (忌口: ${s.dietRestrictions.join(',')})` : '';
        const notePart = s.restaurantNote ? ` (推薦: ${s.restaurantNote})` : '';
        text += `${num}號 ${namePart}${s.favoriteFood}${dietPart}${notePart}\n`;
      } else {
        text += `${num}號 (尚未填寫)\n`;
      }
    });

    text += `\n🎉 感謝大家填寫！`;
    lineShareText.value = text;
  }

  confirmCopyLineBtn.addEventListener('click', () => {
    lineShareText.select();
    navigator.clipboard.writeText(lineShareText.value).then(() => {
      showToast('📋 清單已成功複製到剪貼簿！可直接貼上 LINE 班群');
      lineShareModal.classList.remove('is-open');
    }).catch(() => {
      // 兼容備用方案
      document.execCommand('copy');
      showToast('📋 已複製到剪貼簿！');
      lineShareModal.classList.remove('is-open');
    });
  });

  closeLineModalBtn.addEventListener('click', () => lineShareModal.classList.remove('is-open'));
  cancelLineModalBtn.addEventListener('click', () => lineShareModal.classList.remove('is-open'));
  lineShareModal.addEventListener('click', (e) => {
    if (e.target === lineShareModal) lineShareModal.classList.remove('is-open');
  });

  // 匯出 CSV (支援 Excel UTF-8 BOM)
  exportCsvBtn.addEventListener('click', () => {
    let csvContent = '\uFEFF'; // UTF-8 BOM 避免 Excel 亂碼
    csvContent += '座號,姓名/暱稱,想吃的美食,飲食忌口,推薦店家/備註,填寫狀態\n';

    seatsData.forEach(s => {
      const isFilled = s.favoriteFood.trim() !== '';
      const seatNo = `="${s.seatNumber}"`;
      const name = `"${(s.studentName || '').replace(/"/g, '""')}"`;
      const food = `"${(s.favoriteFood || '').replace(/"/g, '""')}"`;
      const diet = `"${(s.dietRestrictions || []).join('; ').replace(/"/g, '""')}"`;
      const note = `"${(s.restaurantNote || '').replace(/"/g, '""')}"`;
      const status = isFilled ? '已填寫' : '未填寫';

      csvContent += `${seatNo},${name},${food},${diet},${note},${status}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `班級31人聚餐美食調查表_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('📥 已成功下載 CSV 表格檔案！');
  });

  // ==========================================
  // 展示範例資料與重設功能
  // ==========================================
  const SAMPLE_FOODS = [
    { name: '小明', food: '麻辣火鍋', diet: ['不吃牛'], note: '海底撈或肉多多' },
    { name: '雅婷', food: '日式燒肉', diet: ['不吃辣'], note: '屋馬燒肉或乾杯' },
    { name: '冠宇', food: '壽司日料', diet: [], note: '壽司郎或藏壽司' },
    { name: '品萱', food: '麻辣火鍋、鴨血', diet: [], note: '鼎王麻辣鍋' },
    { name: '柏翰', food: '美式漢堡、薯條', diet: [], note: '學校旁邊那家漢堡' },
    { name: '佳穎', food: '義大利麵、燉飯', diet: ['素食(全素/蛋奶素)'], note: '要看有沒有蔬食套餐' },
    { name: '俊廷', food: '日式燒肉', diet: ['不吃牛'], note: '可以吃豬五花' },
    { name: '詩涵', food: '豚骨拉麵、煎餃', diet: ['不吃辣'], note: '一蘭拉麵' },
    { name: '宇翔', food: '韓式炸雞、年糕', diet: [], note: '起家雞' },
    { name: '依庭', food: '麻辣火鍋', diet: ['海鮮過敏'], note: '海鮮不要放進鍋底' },
    { name: '子軒', food: '窯烤披薩、炸雞', diet: [], note: '薄多義' },
    { name: '若晴', food: '泰式料理', diet: [], note: '瓦城泰統' },
    { name: '家豪', food: '港式飲茶、燒賣', diet: ['不吃牛'], note: '點點心' },
    { name: '欣妤', food: '麻辣火鍋', diet: ['不吃辣'], note: '可以點鴛鴦鍋白湯' },
    { name: '彥博', food: '吃到飽百匯', diet: [], note: '饗食天堂' },
    { name: '佩璇', food: '精緻甜點、鬆餅', diet: [], note: '希望吃完有甜點' },
    { name: '昱廷', food: '日式燒肉', diet: [], note: '牛角燒肉' },
    { name: '芷晴', food: '壽司日料', diet: ['甲殼/花生過敏'], note: '甲殼類不行' },
    { name: '偉倫', food: '豚骨拉麵', diet: [], note: '麵屋武藏' },
    { name: '靜雯', food: '麻辣火鍋', diet: [], note: '青花驕' },
    { name: '承恩', food: '美式漢堡', diet: ['不吃豬'], note: '純牛肉堡OK' },
    { name: '羽涵', food: '韓式炸雞', diet: [], note: 'bb.q CHICKEN' }
  ];

  quickFillSampleBtn.addEventListener('click', () => {
    if (confirm('是否自動填入示範資料？（將填入 22 位同學的範例喜好，方便預覽統計排行榜、忌口分析與幸運轉盤）')) {
      SAMPLE_FOODS.forEach((item, idx) => {
        seatsData[idx] = {
          seatNumber: idx + 1,
          studentName: item.name,
          favoriteFood: item.food,
          dietRestrictions: item.diet,
          restaurantNote: item.note,
          updatedAt: new Date().toISOString()
        };
      });
      saveData();
      renderAll();
      showToast('✨ 已填入範例資料！可切換到「排行榜」或「大轉盤」檢視');
    }
  });

  resetAllDataBtn.addEventListener('click', () => {
    if (confirm('⚠️ 警告：確定要清空全班 31 位同學的所有填寫資料嗎？此動作無法復原！')) {
      for (let i = 0; i < TOTAL_SEATS; i++) {
        seatsData[i] = {
          seatNumber: i + 1,
          studentName: '',
          favoriteFood: '',
          dietRestrictions: [],
          restaurantNote: '',
          updatedAt: null
        };
      }
      saveData();
      renderAll();
      showToast('🗑️ 已重設所有 31 人座號資料為初始狀態');
    }
  });

  // ==========================================
  // 幸運美食大轉盤
  // ==========================================
  function initWheelData() {
    const foodCounts = getFoodCounts();
    if (foodCounts.length > 0) {
      wheelFoods = foodCounts.slice(0, 8).map(f => f.name);
    } else {
      wheelFoods = ['麻辣火鍋', '日式燒肉', '壽司日料', '豚骨拉麵', '義大利麵', '美式漢堡', '韓式炸雞', '窯烤披薩'];
    }
  }

  const WHEEL_COLORS = [
    '#f97316', '#fbbf24', '#10b981', '#06b6d4',
    '#6366f1', '#ec4899', '#8b5cf6', '#14b8a6'
  ];

  function drawWheel() {
    if (!wheelCanvas) return;
    const ctx = wheelCanvas.getContext('2d');
    const width = wheelCanvas.width;
    const height = wheelCanvas.height;
    const radius = width / 2;
    const numSegments = wheelFoods.length;
    const angleStep = (2 * Math.PI) / numSegments;

    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(radius, radius);
    ctx.rotate(currentWheelAngle);

    for (let i = 0; i < numSegments; i++) {
      const startAngle = i * angleStep;
      const endAngle = (i + 1) * angleStep;

      // 畫扇區
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius - 8, startAngle, endAngle);
      ctx.fillStyle = WHEEL_COLORS[i % WHEEL_COLORS.length];
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      // 畫文字
      ctx.save();
      ctx.rotate(startAngle + angleStep / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px "Noto Sans TC", sans-serif';
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 4;
      ctx.fillText(wheelFoods[i], radius - 28, 6);
      ctx.restore();
    }

    // 畫中心圓
    ctx.beginPath();
    ctx.arc(0, 0, 32, 0, 2 * Math.PI);
    ctx.fillStyle = '#1e293b';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#f97316';
    ctx.stroke();

    // 中心裝飾
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🍽️', 0, 6);

    ctx.restore();
  }

  spinWheelBtn.addEventListener('click', () => {
    if (isSpinning) return;
    isSpinning = true;
    wheelResult.style.display = 'none';
    spinWheelBtn.disabled = true;

    const numSegments = wheelFoods.length;
    const angleStep = (2 * Math.PI) / numSegments;
    const extraSpins = 5 + Math.floor(Math.random() * 4); // 轉 5 ~ 8 圈
    const randomStopAngle = Math.random() * 2 * Math.PI;
    const totalRotation = extraSpins * 2 * Math.PI + randomStopAngle;

    const startAngle = currentWheelAngle;
    const startTime = performance.now();
    const duration = 4000; // 4秒

    function animate(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // 緩慢減速 cubic ease-out
      const easeOut = 1 - Math.pow(1 - progress, 3);

      currentWheelAngle = startAngle + totalRotation * easeOut;
      drawWheel();

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        isSpinning = false;
        spinWheelBtn.disabled = false;

        // 計算頂部指針指向的項目
        // 指針在正上方 (3 * Math.PI / 2)
        const normalizedAngle = (2 * Math.PI - (currentWheelAngle % (2 * Math.PI))) % (2 * Math.PI);
        // 指針位於頂部 270度 = 1.5 * PI
        const pointerAngle = (normalizedAngle + (3 * Math.PI / 2)) % (2 * Math.PI);
        const winningIndex = Math.floor(pointerAngle / angleStep) % numSegments;
        const winner = wheelFoods[winningIndex];

        wheelResultText.textContent = winner;
        wheelResult.style.display = 'block';
        showToast(`🎉 轉盤結果出爐：今天就去吃【${winner}】吧！`);
      }
    }

    requestAnimationFrame(animate);
  });

  // ==========================================
  // 主題切換 (Dark / Light Mode)
  // ==========================================
  function initTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY) || 'dark';
    document.body.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
  }

  function updateThemeIcon(theme) {
    const icon = themeToggleBtn.querySelector('.theme-icon');
    if (icon) {
      icon.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
  }

  themeToggleBtn.addEventListener('click', () => {
    const current = document.body.getAttribute('data-theme') || 'dark';
    const nextTheme = current === 'dark' ? 'light' : 'dark';
    document.body.setAttribute('data-theme', nextTheme);
    localStorage.setItem(THEME_KEY, nextTheme);
    updateThemeIcon(nextTheme);
  });

  // ==========================================
  // 提示 Toast
  // ==========================================
  let toastTimer = null;
  function showToast(msg) {
    if (toastTimer) clearTimeout(toastTimer);
    toastMessage.textContent = msg;
    toast.classList.add('show');
    toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, 3200);
  }

  // 安全跳脫 HTML 標籤
  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ==========================================
  // 啟動應用
  // ==========================================
  initTheme();
  initData();
  renderAll();
})();
