const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const JWT_SECRET = 'your-secret-key-change-in-production';

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

const DATA_FILE = path.join(__dirname, 'data.json');

function initData() {
  let data;
  
  if (!fs.existsSync(DATA_FILE)) {
    data = {
      users: [
        {
          id: 1,
          username: 'admin',
          password: bcrypt.hashSync('admin', 10),
          role: 'admin'
        }
      ],
      scooters: []
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } else {
    try {
      data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      
      const adminExists = data.users && data.users.some(u => u.username === 'admin');
      
      if (!adminExists) {
        if (!data.users) {
          data.users = [];
        }
        const maxId = data.users.length > 0 ? Math.max(...data.users.map(u => u.id)) : 0;
        data.users.push({
          id: maxId + 1,
          username: 'admin',
          password: bcrypt.hashSync('admin', 10),
          role: 'admin'
        });
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
      }
      
      if (!data.users) {
        data.users = [{
          id: 1,
          username: 'admin',
          password: bcrypt.hashSync('admin', 10),
          role: 'admin'
        }];
      }
      if (!data.scooters) {
        data.scooters = [];
      }
      if (!data.rides) {
        data.rides = [];
      }
      
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Ошибка чтения data.json, создаем новый файл:', error);
      data = {
        users: [
          {
            id: 1,
            username: 'admin',
            password: bcrypt.hashSync('admin', 10),
            role: 'admin'
          }
        ],
        scooters: [],
        rides: []
      };
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    }
  }
}

function loadData() {
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  
  if (data.scooters) {
    let needsSave = false;
    data.scooters.forEach(scooter => {
      if (scooter.pricePerMinute === undefined) {
        scooter.pricePerMinute = scooter.pricePerHour ? (scooter.pricePerHour / 60).toFixed(2) : 2;
        needsSave = true;
      }
    });
    
    if (needsSave) {
      saveData(data);
    }
  }
  
  return data;
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

initData();

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Токен не предоставлен' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Недействительный токен' });
    }
    req.user = user;
    next();
  });
}

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Логин и пароль обязательны' });
  }

  const data = loadData();
  const user = data.users.find(u => u.username === username);

  if (!user) {
    return res.status(401).json({ error: 'Неверный логин или пароль' });
  }

  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) {
    return res.status(401).json({ error: 'Неверный логин или пароль' });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role
    }
  });
});

app.get('/api/scooters', authenticateToken, (req, res) => {
  const data = loadData();
  res.json(data.scooters);
});

app.post('/api/scooters', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Доступ запрещен' });
  }

  const { brand, model, serialNumber, status, location, batteryLevel, pricePerHour, pricePerMinute } = req.body;

  if (!brand || !model || !serialNumber) {
    return res.status(400).json({ error: 'Бренд, модель и серийный номер обязательны' });
  }

  const data = loadData();
  const newScooter = {
    id: data.scooters.length > 0 ? Math.max(...data.scooters.map(s => s.id)) + 1 : 1,
    brand,
    model,
    serialNumber,
    status: status || 'available',
    location: location || '',
    batteryLevel: batteryLevel || 100,
    pricePerHour: pricePerHour || 100,
    pricePerMinute: pricePerMinute || 2,
    createdAt: new Date().toISOString()
  };

  data.scooters.push(newScooter);
  saveData(data);

  res.status(201).json(newScooter);
});

app.put('/api/scooters/:id', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Доступ запрещен' });
  }

  const data = loadData();
  const scooterIndex = data.scooters.findIndex(s => s.id === parseInt(req.params.id));

  if (scooterIndex === -1) {
    return res.status(404).json({ error: 'Самокат не найден' });
  }

  const { brand, model, serialNumber, status, location, batteryLevel, pricePerHour, pricePerMinute } = req.body;
  data.scooters[scooterIndex] = {
    ...data.scooters[scooterIndex],
    ...(brand && { brand }),
    ...(model && { model }),
    ...(serialNumber && { serialNumber }),
    ...(status && { status }),
    ...(location !== undefined && { location }),
    ...(batteryLevel !== undefined && { batteryLevel }),
    ...(pricePerHour !== undefined && { pricePerHour }),
    ...(pricePerMinute !== undefined && { pricePerMinute }),
    updatedAt: new Date().toISOString()
  };

  saveData(data);
  res.json(data.scooters[scooterIndex]);
});

app.delete('/api/scooters/:id', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Доступ запрещен' });
  }

  const data = loadData();
  const scooterIndex = data.scooters.findIndex(s => s.id === parseInt(req.params.id));

  if (scooterIndex === -1) {
    return res.status(404).json({ error: 'Самокат не найден' });
  }

  data.scooters.splice(scooterIndex, 1);
  saveData(data);

  res.json({ message: 'Самокат удален' });
});

app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Логин и пароль обязательны' });
  }

  const data = loadData();
  
  if (data.users.some(u => u.username === username)) {
    return res.status(400).json({ error: 'Пользователь с таким логином уже существует' });
  }

  const maxId = data.users.length > 0 ? Math.max(...data.users.map(u => u.id)) : 0;
  const newUser = {
    id: maxId + 1,
    username,
    password: bcrypt.hashSync(password, 10),
    role: 'user'
  };

  data.users.push(newUser);
  saveData(data);

  res.status(201).json({
    id: newUser.id,
    username: newUser.username,
    role: newUser.role
  });
});

app.get('/api/users', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Доступ запрещен' });
  }

  const data = loadData();
  const users = data.users.map(u => ({
    id: u.id,
    username: u.username,
    role: u.role
  }));
  res.json(users);
});

app.delete('/api/users/:id', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Доступ запрещен' });
  }

  const userId = parseInt(req.params.id);
  
  if (req.user.id === userId) {
    return res.status(400).json({ error: 'Нельзя удалить свой собственный аккаунт' });
  }

  const data = loadData();
  const userIndex = data.users.findIndex(u => u.id === userId);

  if (userIndex === -1) {
    return res.status(404).json({ error: 'Пользователь не найден' });
  }

  data.users.splice(userIndex, 1);
  saveData(data);

  res.json({ message: 'Пользователь удален' });
});

app.get('/api/me', authenticateToken, (req, res) => {
  res.json(req.user);
});

app.post('/api/rides/start', authenticateToken, (req, res) => {
  const { scooterId } = req.body;

  if (!scooterId) {
    return res.status(400).json({ error: 'ID самоката обязателен' });
  }

  const data = loadData();
  const scooter = data.scooters.find(s => s.id === parseInt(scooterId));

  if (!scooter) {
    return res.status(404).json({ error: 'Самокат не найден' });
  }

  if (scooter.status !== 'available') {
    return res.status(400).json({ error: 'Самокат недоступен для аренды' });
  }

  const activeRide = data.rides && data.rides.find(r => r.userId === req.user.id && r.status === 'active');
  if (activeRide) {
    return res.status(400).json({ error: 'У вас уже есть активная поездка' });
  }

  if (!data.rides) {
    data.rides = [];
  }

  const maxRideId = data.rides.length > 0 ? Math.max(...data.rides.map(r => r.id)) : 0;
  const newRide = {
    id: maxRideId + 1,
    userId: req.user.id,
    scooterId: parseInt(scooterId),
    startTime: new Date().toISOString(),
    status: 'active',
    pricePerMinute: scooter.pricePerMinute || (scooter.pricePerHour / 60)
  };

  data.rides.push(newRide);

  const scooterIndex = data.scooters.findIndex(s => s.id === parseInt(scooterId));
  data.scooters[scooterIndex].status = 'rented';

  saveData(data);

  res.status(201).json(newRide);
});

app.post('/api/rides/end/:id', authenticateToken, (req, res) => {
  const rideId = parseInt(req.params.id);
  const data = loadData();

  if (!data.rides) {
    return res.status(404).json({ error: 'Поездка не найдена' });
  }

  const rideIndex = data.rides.findIndex(r => r.id === rideId && r.userId === req.user.id);

  if (rideIndex === -1) {
    return res.status(404).json({ error: 'Поездка не найдена' });
  }

  const ride = data.rides[rideIndex];

  if (ride.status !== 'active') {
    return res.status(400).json({ error: 'Поездка уже завершена' });
  }

  const startTime = new Date(ride.startTime);
  const endTime = new Date();
  const durationMinutes = Math.ceil((endTime - startTime) / (1000 * 60));
  const totalCost = (ride.pricePerMinute * durationMinutes).toFixed(2);

  data.rides[rideIndex] = {
    ...ride,
    endTime: endTime.toISOString(),
    status: 'completed',
    durationMinutes,
    totalCost: parseFloat(totalCost)
  };

  const scooterIndex = data.scooters.findIndex(s => s.id === ride.scooterId);
  if (scooterIndex !== -1) {
    data.scooters[scooterIndex].status = 'available';
  }

  saveData(data);

  res.json(data.rides[rideIndex]);
});

app.get('/api/rides', authenticateToken, (req, res) => {
  const data = loadData();
  
  if (!data.rides) {
    return res.json([]);
  }

  const userRides = data.rides
    .filter(r => r.userId === req.user.id)
    .map(ride => {
      const scooter = data.scooters.find(s => s.id === ride.scooterId);
      return {
        ...ride,
        scooter: scooter ? {
          brand: scooter.brand,
          model: scooter.model,
          serialNumber: scooter.serialNumber
        } : null
      };
    })
    .sort((a, b) => new Date(b.startTime) - new Date(a.startTime));

  res.json(userRides);
});

app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});

