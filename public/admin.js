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

async function loadScooters() {
    try {
        const scooters = await apiRequest('/scooters');
        displayScooters(scooters);
    } catch (error) {
        console.error('Ошибка загрузки самокатов:', error);
        showMessage('Ошибка загрузки самокатов: ' + error.message, 'error');
    }
}

function displayScooters(scooters) {
    const container = document.getElementById('scootersList');
    
    if (scooters.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">Самокаты не найдены</p>';
        return;
    }

    container.innerHTML = scooters.map(scooter => `
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
                <strong>Цена за минуту:</strong> ${scooter.pricePerMinute || 2} ₽
            </div>
            <div class="status-badge status-${scooter.status}">
                ${getStatusText(scooter.status)}
            </div>
            <div class="scooter-actions">
                <button class="btn-edit" onclick="editScooter(${scooter.id})">Редактировать</button>
                <button class="btn-delete" onclick="deleteScooter(${scooter.id})">Удалить</button>
            </div>
        </div>
    `).join('');
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

function showMessage(message, type = 'success') {
    const messageEl = document.getElementById('formMessage');
    messageEl.textContent = message;
    messageEl.className = `message ${type}`;
    messageEl.style.display = 'block';

    setTimeout(() => {
        messageEl.style.display = 'none';
    }, 5000);
}

if (document.getElementById('addScooterForm')) {
    document.getElementById('addScooterForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = {
            brand: document.getElementById('brand').value,
            model: document.getElementById('model').value,
            serialNumber: document.getElementById('serialNumber').value,
            status: document.getElementById('status').value,
            location: document.getElementById('location').value,
            batteryLevel: parseInt(document.getElementById('batteryLevel').value),
            pricePerHour: parseFloat(document.getElementById('pricePerHour').value),
            pricePerMinute: parseFloat(document.getElementById('pricePerMinute').value)
        };

        try {
            await apiRequest('/scooters', {
                method: 'POST',
                body: JSON.stringify(formData)
            });

            showMessage('Самокат успешно добавлен!', 'success');
            document.getElementById('addScooterForm').reset();
            loadScooters();
        } catch (error) {
            showMessage('Ошибка добавления самоката: ' + error.message, 'error');
        }
    });
}

async function deleteScooter(id) {
    if (!confirm('Вы уверены, что хотите удалить этот самокат?')) {
        return;
    }

    try {
        await apiRequest(`/scooters/${id}`, {
            method: 'DELETE'
        });

        showMessage('Самокат успешно удален!', 'success');
        loadScooters();
    } catch (error) {
        showMessage('Ошибка удаления самоката: ' + error.message, 'error');
    }
}

async function editScooter(id) {
    try {
        const scooters = await apiRequest('/scooters');
        const scooter = scooters.find(s => s.id === id);

        if (!scooter) {
            showMessage('Самокат не найден', 'error');
            return;
        }

        document.getElementById('brand').value = scooter.brand;
        document.getElementById('model').value = scooter.model;
        document.getElementById('serialNumber').value = scooter.serialNumber;
        document.getElementById('status').value = scooter.status;
        document.getElementById('location').value = scooter.location || '';
        document.getElementById('batteryLevel').value = scooter.batteryLevel;
        document.getElementById('pricePerHour').value = scooter.pricePerHour;
        document.getElementById('pricePerMinute').value = scooter.pricePerMinute || 2;

        const form = document.getElementById('addScooterForm');
        const originalHandler = form.onsubmit;
        
        form.onsubmit = async (e) => {
            e.preventDefault();

            const formData = {
                brand: document.getElementById('brand').value,
                model: document.getElementById('model').value,
                serialNumber: document.getElementById('serialNumber').value,
                status: document.getElementById('status').value,
                location: document.getElementById('location').value,
                batteryLevel: parseInt(document.getElementById('batteryLevel').value),
                pricePerHour: parseFloat(document.getElementById('pricePerHour').value),
                pricePerMinute: parseFloat(document.getElementById('pricePerMinute').value)
            };

            try {
                await apiRequest(`/scooters/${id}`, {
                    method: 'PUT',
                    body: JSON.stringify(formData)
                });

                showMessage('Самокат успешно обновлен!', 'success');
                form.reset();
                form.onsubmit = originalHandler;
                loadScooters();
            } catch (error) {
                showMessage('Ошибка обновления самоката: ' + error.message, 'error');
            }
        };

        document.querySelector('.add-scooter-section').scrollIntoView({ behavior: 'smooth' });
        showMessage('Заполните форму и нажмите "Добавить самокат" для сохранения изменений', 'success');
    } catch (error) {
        showMessage('Ошибка загрузки данных самоката: ' + error.message, 'error');
    }
}

function showSection(section) {
    document.getElementById('scootersSection').style.display = 'none';
    document.getElementById('usersSection').style.display = 'none';
    document.getElementById('profileSection').style.display = 'none';
    
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    
    if (section === 'scooters') {
        document.getElementById('scootersSection').style.display = 'block';
        document.querySelectorAll('.nav-btn')[0].classList.add('active');
    } else if (section === 'users') {
        document.getElementById('usersSection').style.display = 'block';
        document.querySelectorAll('.nav-btn')[1].classList.add('active');
        loadUsers();
    } else if (section === 'profile') {
        document.getElementById('profileSection').style.display = 'block';
        document.querySelectorAll('.nav-btn')[2].classList.add('active');
        loadProfile();
    }
}

async function loadProfile() {
    try {
        const user = await apiRequest('/me');
        const rides = await apiRequest('/rides').catch(() => []);
        
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

async function loadUsers() {
    try {
        const users = await apiRequest('/users');
        displayUsers(users);
    } catch (error) {
        console.error('Ошибка загрузки пользователей:', error);
        showUserMessage('Ошибка загрузки пользователей: ' + error.message, 'error');
    }
}

async function displayUsers(users) {
    const container = document.getElementById('usersList');
    
    if (users.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">Пользователи не найдены</p>';
        return;
    }

    const currentUser = await apiRequest('/me').catch(() => null);
    
    container.innerHTML = users.map(user => `
        <div class="user-card">
            <h3>${user.username}</h3>
            <div class="scooter-info">
                <strong>ID:</strong> ${user.id}
            </div>
            <div class="scooter-info">
                <strong>Роль:</strong> ${user.role === 'admin' ? 'Администратор' : 'Пользователь'}
            </div>
            <div class="status-badge ${user.role === 'admin' ? 'status-available' : 'status-rented'}">
                ${user.role === 'admin' ? 'Администратор' : 'Пользователь'}
            </div>
            ${currentUser && currentUser.id !== user.id ? `
                <div class="scooter-actions" style="margin-top: 15px;">
                    <button class="btn-delete" onclick="deleteUser(${user.id})">Удалить</button>
                </div>
            ` : ''}
        </div>
    `).join('');
}

function showUserMessage(message, type = 'success') {
    const messageEl = document.createElement('div');
    messageEl.className = `message ${type}`;
    messageEl.textContent = message;
    messageEl.style.display = 'block';
    messageEl.style.position = 'fixed';
    messageEl.style.top = '20px';
    messageEl.style.right = '20px';
    messageEl.style.zIndex = '1000';
    messageEl.style.padding = '15px 20px';
    messageEl.style.borderRadius = '8px';
    messageEl.style.minWidth = '300px';
    
    document.body.appendChild(messageEl);

    setTimeout(() => {
        messageEl.style.display = 'none';
        setTimeout(() => messageEl.remove(), 300);
    }, 5000);
}

async function deleteUser(id) {
    if (!confirm('Вы уверены, что хотите удалить этого пользователя?')) {
        return;
    }

    try {
        await apiRequest(`/users/${id}`, {
            method: 'DELETE'
        });

        showUserMessage('Пользователь успешно удален!', 'success');
        loadUsers();
    } catch (error) {
        showUserMessage('Ошибка удаления пользователя: ' + error.message, 'error');
    }
}


document.addEventListener('DOMContentLoaded', () => {
    loadScooters();
});

