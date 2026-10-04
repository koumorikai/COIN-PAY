import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { WebApp } from '@twa-dev/sdk';
import './App.css';

// Моковые данные на случай пустой БД или ошибки сети
const DEFAULT_SERVICES = [
  {
    code: 'steam',
    title: 'Steam',
    description: 'Мгновенное пополнение кошелька Steam по логину',
    rate_rub: 100,
    currency_label: 'USD'
  },
  {
    code: 'telegram',
    title: 'Telegram Stars',
    description: 'Пополнение звёзд для каналов и ботов',
    rate_rub: 2,
    currency_label: 'Stars'
  }
];

const supabase = createClient(
  'https://mfpvughqwpvkicpjcrjz.supabase.co',
  'ТВОЙ_SERVICE_ROLE_ИЛИ_ANON_KEY'
);

export default function App() {
  const [services, setServices] = useState(DEFAULT_SERVICES);
  const [selectedService, setSelectedService] = useState(DEFAULT_SERVICES[0]);
  const [targetAccount, setTargetAccount] = useState('');
  const [amount, setAmount] = useState('');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Инициализация Telegram WebApp
    try {
      if (WebApp?.ready) WebApp.ready();
      if (WebApp?.expand) WebApp.expand();
      if (WebApp?.initDataUnsafe?.user) {
        setUser(WebApp.initDataUnsafe.user);
      }
    } catch (e) {
      console.warn("WebApp не запущен в Telegram", e);
    }

    // Загрузка услуг из Supabase
    const fetchServices = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.from('services').select('*');
        if (!error && data && data.length > 0) {
          setServices(data);
          setSelectedService(data[0]);
        }
      } catch (err) {
        console.error("Ошибка при запросе к Supabase:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, []); // Пустой массив зависимостей исключает бесконечный цикл

  const handleOrder = async () => {
    if (!targetAccount || !amount || !selectedService) {
      const msg = 'Заполните все поля!';
      if (WebApp?.showAlert) WebApp.showAlert(msg);
      else alert(msg);
      return;
    }

    const totalRub = parseFloat(amount) * selectedService.rate_rub;

    const { error } = await supabase.from('orders').insert({
      user_id: user?.id || 0,
      service_code: selectedService.code,
      target_account: targetAccount,
      amount_service: parseFloat(amount),
      amount_rub: totalRub,
      status: 'pending'
    });

    if (error) {
      const err = 'Ошибка создания заказа: ' + error.message;
      if (WebApp?.showAlert) WebApp.showAlert(err);
      else alert(err);
      return;
    }

    const successMsg = `Заказ создан! К оплате: ${totalRub} RUB.`;
    if (WebApp?.showAlert) WebApp.showAlert(successMsg);
    else alert(successMsg);
  };

  return (
    <div className="shop-container">
      <h1 className="header-title">Пополнение сервисов</h1>

      {loading ? (
        <div className="loading-text">Загрузка данных...</div>
      ) : (
        <>
          {/* Селектор категорий */}
          <div className="services-scroll">
            {services.map((s) => (
              <button
                key={s.code}
                type="button"
                onClick={() => setSelectedService(s)}
                className={`service-btn ${selectedService?.code === s.code ? 'active' : ''}`}
              >
                {s.title}
              </button>
            ))}
          </div>

          {/* Форма ввода */}
          {selectedService && (
            <div className="card">
              <p className="card-desc">{selectedService.description}</p>

              <div className="input-group">
                <label className="input-label">Аккаунт получателя</label>
                <input
                  type="text"
                  className="custom-input"
                  placeholder={selectedService.code === 'steam' ? 'Логин Steam' : '@username'}
                  value={targetAccount}
                  onChange={(e) => setTargetAccount(e.target.value)}
                />
              </div>

              <div className="input-group">
                <label className="input-label">Сумма ({selectedService.currency_label})</label>
                <input
                  type="number"
                  className="custom-input"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>

              {amount && (
                <div className="price-summary">
                  <span className="price-label">Итого к оплате:</span>
                  <span className="price-value">
                    {(parseFloat(amount) * selectedService.rate_rub).toLocaleString('ru-RU')} ₽
                  </span>
                </div>
              )}

              <button type="button" className="submit-btn" onClick={handleOrder}>
                Перейти к оплате
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}