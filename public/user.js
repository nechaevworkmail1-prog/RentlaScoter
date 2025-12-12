const API_URL = 'http://localhost:3000/api';

function getToken() {
    return localStorage.getItem('token');
}

async function apiRequest(url, options = {}) {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${url}`, {
        ...options,
        headers
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Ошибка запроса');
    }

    return response.json();
}

function showSection(section) {
    document.getElementById('availableSection').style.display = 'none';
    document.getElementById('historySection').style.display = 'none';
    document.getElementById('profileSection').style.display = 'none';
    
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    
    if (section === 'available') {
        document.getElementById('availableSection').style.display = 'block';
        document.querySelectorAll('.nav-btn')[0].classList.add('active');
        loadScooters();
    } else if (section === 'history') {
        document.getElementById('historySection').style.display = 'block';
        document.querySelectorAll('.nav-btn')[1].classList.add('active');
        loadRides();
    } else if (section === 'profile') {
        document.getElementById('profileSection').style.display = 'block';
        document.querySelectorAll('.nav-btn')[2].classList.add('active');
        loadProfile();
    }
}

async function loadProfile() {
    try {
        const user = await apiRequest('/me');
        const rides = await apiRequest('/rides');
        
        const totalRides = rides.length;
        const completedRides = rides.filter(r => r.status === 'completed').length;
        const activeRides = rides.filter(r => r.status === 'active').length;
        const totalSpent = rides
            .filter(r => r.status === 'completed' && r.totalCost)
            .reduce((sum, r) => sum + r.totalCost, 0)
            .toFixed(2);
        
        displayProfile(user, {
            totalRides,
            completedRides,
            activeRides,
            totalSpent
        });
    } catch (error) {
        console.error('Ошибка загрузки профиля:', error);
        const container = document.getElementById('profileContent');
        container.innerHTML = '<p style="text-align: center; color: #f44336; padding: 40px;">Ошибка загрузки профиля: ' + error.message + '</p>';
    }
}

function displayProfile(user, stats) {
    const container = document.getElementById('profileContent');
    
    container.innerHTML = `
        <div class="profile-card">
            <div class="profile-avatar">
                <span style="font-size: 64px;">👤</span>
            </div>
            <h3>${user.username}</h3>
            <div class="profile-info">
                <div class="profile-info-item">
                    <strong>Роль:</strong> ${user.role === 'admin' ? 'Администратор' : 'Пользователь'}
                </div>
                <div class="profile-info-item">
                    <strong>ID:</strong> ${user.id}
                </div>
            </div>
            
            <div class="profile-stats">
                <h4>Статистика поездок</h4>
                <div class="stats-grid">
                    <div class="stat-item">
                        <div class="stat-value">${stats.totalRides}</div>
                        <div class="stat-label">Всего поездок</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${stats.completedRides}</div>
                        <div class="stat-label">Завершено</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${stats.activeRides}</div>
                        <div class="stat-label">Активных</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${stats.totalSpent} ₽</div>
                        <div class="stat-label">Потрачено</div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

async function loadScooters() {
    try {
        const scooters = await apiRequest('/scooters');
        const availableScooters = scooters.filter(s => s.status === 'available');
        displayScooters(availableScooters);
    } catch (error) {
        console.error('Ошибка загрузки самокатов:', error);
        const container = document.getElementById('scootersList');
        container.innerHTML = '<p style="text-align: center; color: #f44336; padding: 40px;">Ошибка загрузки самокатов: ' + error.message + '</p>';
    }
}

function displayScooters(scooters) {
    const container = document.getElementById('scootersList');
    
    if (scooters.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">Нет доступных самокатов</p>';
        return;
    }

    container.innerHTML = scooters.map(scooter => {
        const calculatedPricePerMinute = (scooter.pricePerHour / 60).toFixed(2);
        const pricePerMinute = scooter.pricePerMinute || calculatedPricePerMinute;
        
        return `
        <div class="scooter-card">
            <h3>${scooter.brand} ${scooter.model}</h3>
            <div class="scooter-info">
                <strong>Серийный номер:</strong> ${scooter.serialNumber}
            </div>
            <div class="scooter-info">
                <strong>Местоположение:</strong> ${scooter.location || 'Не указано'}
            </div>
            <div class="scooter-info">
                <strong>Уровень заряда:</strong> ${scooter.batteryLevel}%
            </div>
            <div class="scooter-info">
                <strong>Цена за час:</strong> ${scooter.pricePerHour} ₽
            </div>
            <div class="scooter-info">
                <strong>Цена за минуту:</strong> ${pricePerMinute} ₽
                <small style="color: #999; margin-left: 5px;">(${scooter.pricePerHour} / 60)</small>
            </div>
            <div class="status-badge status-${scooter.status}">
                ${getStatusText(scooter.status)}
            </div>
            <div class="scooter-actions" style="margin-top: 15px;">
                <button class="btn-primary" onclick="startRide(${scooter.id})" style="width: 100%;">Арендовать</button>
            </div>
        </div>
    `;
    }).join('');
}

async function startRide(scooterId) {
    if (!confirm('Начать аренду этого самоката?')) {
        return;
    }

    try {
        const ride = await apiRequest('/rides/start', {
            method: 'POST',
            body: JSON.stringify({ scooterId })
        });

        alert('Поездка начата! Не забудьте завершить её после использования.');
        loadScooters();
        loadRides();
    } catch (error) {
        alert('Ошибка начала поездки: ' + error.message);
    }
}

async function loadRides() {
    try {
        const rides = await apiRequest('/rides');
        displayRides(rides);
    } catch (error) {
        console.error('Ошибка загрузки истории:', error);
        const container = document.getElementById('ridesList');
        container.innerHTML = '<p style="text-align: center; color: #f44336; padding: 40px;">Ошибка загрузки истории: ' + error.message + '</p>';
    }
}

function displayRides(rides) {
    const container = document.getElementById('ridesList');
    
    if (rides.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">История поездок пуста</p>';
        return;
    }

    container.innerHTML = rides.map(ride => {
        const startTime = new Date(ride.startTime);
        const startTimeStr = startTime.toLocaleString('ru-RU');
        
        let rideInfo = '';
        if (ride.status === 'active') {
            const durationMinutes = Math.ceil((new Date() - startTime) / (1000 * 60));
            const currentCost = (ride.pricePerMinute * durationMinutes).toFixed(2);
            rideInfo = `
                <div class="scooter-info">
                    <strong>Длительность:</strong> ${durationMinutes} мин (продолжается)
                </div>
                <div class="scooter-info">
                    <strong>Текущая стоимость:</strong> ${currentCost} ₽
                </div>
                <div class="scooter-actions" style="margin-top: 15px;">
                    <button class="btn-secondary" onclick="endRide(${ride.id})">Завершить поездку</button>
                </div>
            `;
        } else if (ride.status === 'completed') {
            const endTime = new Date(ride.endTime);
            const endTimeStr = endTime.toLocaleString('ru-RU');
            rideInfo = `
                <div class="scooter-info">
                    <strong>Завершена:</strong> ${endTimeStr}
                </div>
                <div class="scooter-info">
                    <strong>Длительность:</strong> ${ride.durationMinutes} мин
                </div>
                <div class="scooter-info">
                    <strong>Стоимость:</strong> ${ride.totalCost} ₽
                </div>
            `;
        }

        return `
        <div class="ride-card">
            <h3>${ride.scooter ? `${ride.scooter.brand} ${ride.scooter.model}` : 'Самокат #' + ride.scooterId}</h3>
            <div class="scooter-info">
                <strong>Серийный номер:</strong> ${ride.scooter ? ride.scooter.serialNumber : 'N/A'}
            </div>
            <div class="scooter-info">
                <strong>Начало:</strong> ${startTimeStr}
            </div>
            <div class="status-badge ${ride.status === 'active' ? 'status-rented' : 'status-available'}">
                ${ride.status === 'active' ? 'Активна' : 'Завершена'}
            </div>
            ${rideInfo}
        </div>
    `;
    }).join('');
}

async function endRide(rideId) {
    if (!confirm('Завершить поездку?')) {
        return;
    }

    try {
        const ride = await apiRequest(`/rides/end/${rideId}`, {
            method: 'POST'
        });

        alert(`Поездка завершена!\nДлительность: ${ride.durationMinutes} мин\nСтоимость: ${ride.totalCost} ₽`);
        loadRides();
        loadScooters();
    } catch (error) {
        alert('Ошибка завершения поездки: ' + error.message);
    }
}

function getStatusText(status) {
    const statusMap = {
        'available': 'Доступен',
        'rented': 'Арендован',
        'maintenance': 'На обслуживании',
        'broken': 'Сломан'
    };
    return statusMap[status] || status;
}

document.addEventListener('DOMContentLoaded', () => {
    loadScooters();
    loadRides();
});

