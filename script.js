// ==========================================================
// 1. CONFIGURAÇÃO E INICIALIZAÇÃO DO FIREBASE
// ==========================================================

// **ATENÇÃO:** Substitua com a sua configuração REAL do Firebase!
const firebaseConfig = {
    apiKey: "AIzaSyD62PX1nxz7U5DCS_zEqc252_OcO7t-ixQ",
    authDomain: "lista-75ae2.firebaseapp.com",
    projectId: "lista-75ae2",
    storageBucket: "lista-75ae2.firebasestorage.app",
    messagingSenderId: "927677339472",
    appId: "1:927677339472:web:1ca8ecf0db183f530f3e55",
    measurementId: "G-HEF6G0TQBR"
};

// Inicializa o Firebase
const app = firebase.initializeApp(firebaseConfig);
const db = app.firestore(); // Acessa o Firestore
const agendamentosRef = db.collection("agendamentos_barbearia"); // Coleção para agendamentos

// ==========================================================
// 2. ELEMENTOS DO DOM
// ==========================================================

const calendarGrid = document.getElementById('calendarGrid');
const currentMonthYear = document.getElementById('currentMonthYear');
const prevMonthBtn = document.getElementById('prevMonth');
const nextMonthBtn = document.getElementById('nextMonth');
const timeSlotsContainer = document.getElementById('timeSlots');
const confirmBookingBtn = document.getElementById('confirmBooking');
const selectedDateTimeSpan = document.getElementById('selectedDateTime');

// NOVOS ELEMENTOS DO FORMULÁRIO DE DETALHES
const bookingDetailsDiv = document.getElementById('bookingDetails');
const clientNameInput = document.getElementById('clientName');
const clientContactInput = document.getElementById('clientContact'); // NOVO ELEMENTO
const serviceSelect = document.getElementById('serviceSelect');
const paymentMethodSelect = document.getElementById('paymentMethod');
const totalPriceSpan = document.getElementById('totalPrice');

// ==========================================================
// 3. VARIÁVEIS DE ESTADO DO CALENDÁRIO/AGENDAMENTO
// ==========================================================

let currentDate = new Date(); // Data atual para navegação do calendário
let selectedDate = null;     // Data selecionada pelo usuário
let selectedTime = null;     // Horário selecionado pelo usuário
let bookedAppointments = []; // Armazena agendamentos do Firebase para o dia selecionado

const openingHour = 8;  // 08:00
const closingHour = 22; // 22:00 (último agendamento possível é às 21:00 para terminar às 22:00)
const serviceInterval = 1; // Intervalo de 1 hora entre os serviços

// LISTA DE SERVIÇOS COM PREÇOS para lógica de cálculo
const servicesList = {
    "Serviço 1": 10.00,
    "Serviço 2": 10.00,
    "Serviço 3": 10.00,
    "Serviço 4": 10.00,
    "Serviço 5": 10.00,
    "Serviço 6": 10.00
};

// ==========================================================
// 4. FUNÇÕES DO CALENDÁRIO
// ==========================================================

/**
 * Renderiza o calendário para o mês e ano atuais.
 */
function renderCalendar() {
    calendarGrid.innerHTML = ''; // Limpa o calendário existente

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth(); // 0-11 (Janeiro = 0)
    
    currentMonthYear.textContent = new Date(year, month).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

    // Pega o dia da semana do 1º dia do mês (0=Dom, 6=Sáb)
    const firstDayOfMonth = new Date(year, month, 1).getDay(); 
    // Total de dias no mês
    const daysInMonth = new Date(year, month + 1, 0).getDate(); 

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Zera hora para comparação de data

    // Renderiza os nomes dos dias da semana
    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    dayNames.forEach(day => {
        const dayNameDiv = document.createElement('div');
        dayNameDiv.classList.add('day-name');
        dayNameDiv.textContent = day;
        calendarGrid.appendChild(dayNameDiv);
    });

    // Renderiza células vazias antes do 1º dia do mês
    for (let i = 0; i < firstDayOfMonth; i++) {
        const emptyDiv = document.createElement('div');
        emptyDiv.classList.add('empty');
        calendarGrid.appendChild(emptyDiv);
    }

    // Renderiza os dias do mês
    for (let day = 1; day <= daysInMonth; day++) {
        const dayCell = document.createElement('div');
        dayCell.classList.add('day-cell');
        dayCell.textContent = day;

        const currentDay = new Date(year, month, day);
        currentDay.setHours(0, 0, 0, 0);

        // Desabilita dias passados
        if (currentDay < today) {
            dayCell.classList.add('disabled');
        } else {
            // Adiciona evento de clique para selecionar a data
            dayCell.addEventListener('click', () => selectDate(currentDay, dayCell));
        }

        // Marca o dia de hoje
        if (currentDay.getTime() === today.getTime()) {
            dayCell.classList.add('today');
        }

        // Marca a data selecionada (se houver e for o dia certo)
        if (selectedDate && currentDay.getTime() === selectedDate.getTime()) {
            dayCell.classList.add('selected');
        }

        calendarGrid.appendChild(dayCell);
    }

    // Se uma data já estiver selecionada e ela for do mês atualmente visível, 
    // recarrega os horários. Caso contrário, reseta a exibição de horários.
    if (selectedDate && selectedDate.getMonth() === month && selectedDate.getFullYear() === year) {
        loadBookedAppointments(selectedDate);
    } else {
        timeSlotsContainer.innerHTML = '<p class="no-slots">Selecione uma data para ver os horários.</p>';
        selectedDateTimeSpan.textContent = '';
        bookingDetailsDiv.style.display = 'none'; // Esconde o formulário
        confirmBookingBtn.disabled = true;
    }
}

/**
 * Seleciona uma data no calendário.
 * @param {Date} date - A data a ser selecionada.
 * @param {HTMLElement} dayCellElement - O elemento DIV HTML da célula do dia clicada.
 */
function selectDate(date, dayCellElement) {
    // Remove a classe 'selected' de qualquer célula previamente selecionada
    const prevSelected = document.querySelector('.day-cell.selected');
    if (prevSelected) {
        prevSelected.classList.remove('selected');
    }

    selectedDate = date; // Atualiza a variável de estado
    dayCellElement.classList.add('selected'); // Adiciona a classe 'selected' ao elemento clicado

    selectedTime = null; // Reseta o horário ao mudar a data
    selectedDateTimeSpan.textContent = `Data selecionada: ${selectedDate.toLocaleDateString('pt-BR')}`;
    
    bookingDetailsDiv.style.display = 'none'; // Esconde o formulário de detalhes ao mudar a data
    confirmBookingBtn.disabled = true; // Desabilita botão até um horário ser escolhido

    loadBookedAppointments(selectedDate); // Carrega agendamentos para a nova data
}

// ==========================================================
// 5. FUNÇÕES DE HORÁRIOS
// ==========================================================

/**
 * Gera e exibe os horários disponíveis para a data selecionada.
 * @param {Array} bookedTimes - Array de strings de horários já agendados para a data.
 */
function generateTimeSlots(bookedTimes) {
    timeSlotsContainer.innerHTML = '';
    let hasAvailableSlots = false;
    const now = new Date(); // Para comparar com a hora atual

    for (let hour = openingHour; hour < closingHour; hour += serviceInterval) {
        const time = `${String(hour).padStart(2, '0')}:00`; // Formato "HH:00"
        const timeSlotDiv = document.createElement('div');
        timeSlotDiv.classList.add('time-slot');
        timeSlotDiv.textContent = time;

        const currentSlotDateTime = new Date(selectedDate);
        currentSlotDateTime.setHours(hour, 0, 0, 0); // Define a hora para comparação

        const isBooked = bookedTimes.includes(time);
        const isPast = (currentSlotDateTime < now); // Verifica se o horário já passou

        if (isBooked) {
            timeSlotDiv.classList.add('booked');
        } else if (isPast) {
            // Se a data selecionada é hoje e o horário já passou
            timeSlotDiv.classList.add('disabled'); 
            timeSlotDiv.style.cursor = 'not-allowed';
            timeSlotDiv.style.opacity = '0.6';
        } else {
            // Horário disponível
            timeSlotDiv.addEventListener('click', () => selectTime(timeSlotDiv, time));
            hasAvailableSlots = true;
        }
        timeSlotsContainer.appendChild(timeSlotDiv);
    }

    // Mensagens caso não haja slots
    if (!hasAvailableSlots && bookedTimes.length > 0) {
        timeSlotsContainer.innerHTML = '<p class="no-slots">Todos os horários estão agendados para este dia.</p>';
    } else if (!hasAvailableSlots && bookedTimes.length === 0) {
        // Isso pode acontecer se todos os horários são no passado para o dia selecionado
        timeSlotsContainer.innerHTML = '<p class="no-slots">Não há horários disponíveis para agendamento neste dia.</p>';
    }
}

/**
 * Seleciona um horário disponível.
 * @param {HTMLElement} element - O elemento HTML do horário clicado.
 * @param {string} time - O horário selecionado (ex: "09:00").
 */
function selectTime(element, time) {
    // Remove a classe 'selected' de qualquer horário previamente selecionado
    const prevSelected = document.querySelector('.time-slot.selected');
    if (prevSelected) {
        prevSelected.classList.remove('selected');
    }

    selectedTime = time; // Atualiza a variável de estado
    element.classList.add('selected'); // Adiciona a classe 'selected' ao elemento clicado

    selectedDateTimeSpan.textContent = `Horário selecionado: ${selectedDate.toLocaleDateString('pt-BR')} às ${selectedTime}`;
    
    // EXIBE O FORMULÁRIO DE DETALHES E ATUALIZA O ESTADO DO BOTÃO
    bookingDetailsDiv.style.display = 'block'; 
    updateConfirmationState(); // Verifica o estado inicial dos campos do formulário
}

// ==========================================================
// 6. FUNÇÕES AUXILIARES DO FORMULÁRIO
// ==========================================================

/**
 * Calcula o preço total e atualiza o estado do botão de confirmação.
 * Habilita o botão apenas se todos os campos obrigatórios estiverem preenchidos.
 */
function updateConfirmationState() {
    const clientName = clientNameInput.value.trim();
    const clientContact = clientContactInput.value.trim(); // NOVO: Captura o valor do contato
    const selectedService = serviceSelect.value;
    const paymentMethod = paymentMethodSelect.value;

    // 1. Calcula e exibe o preço
    const price = servicesList[selectedService] || 0; // Pega o preço do serviço selecionado
    totalPriceSpan.textContent = `R$ ${price.toFixed(2).replace('.', ',')}`;

    // 2. Habilita/Desabilita o botão de confirmação
    // NOVO: clientContact.length > 8 (um mínimo razoável para um telefone, ajuste se preferir outro)
    const isValid = selectedService !== "" && paymentMethod !== "" && clientName.length > 2 && clientContact.length > 8; 

    confirmBookingBtn.disabled = !isValid;
}


// ==========================================================
// 7. FUNÇÕES DE AGENDAMENTO (Firebase Interaction)
// ==========================================================

/**
 * Carrega os agendamentos já existentes para a data selecionada do Firebase.
 * @param {Date} date - A data para verificar agendamentos.
 */
async function loadBookedAppointments(date) {
    if (!date) {
        timeSlotsContainer.innerHTML = '<p class="no-slots">Selecione uma data para ver os horários.</p>';
        return;
    }

    const dateString = date.toISOString().split('T')[0]; // Formato "YYYY-MM-DD"

    // Consulta os agendamentos no Firestore para a data específica
    try {
        const snapshot = await agendamentosRef.where('date', '==', dateString).get();
        // Extrai apenas os horários dos documentos encontrados
        bookedAppointments = snapshot.docs.map(doc => doc.data().time); 
        generateTimeSlots(bookedAppointments); // Gera os horários com base nos agendados
    } catch (error) {
        console.error("Erro ao carregar agendamentos: ", error);
        alert("Não foi possível carregar os horários. Por favor, tente novamente.");
        timeSlotsContainer.innerHTML = '<p class="no-slots">Erro ao carregar horários.</p>';
    }
}

/**
 * Confirma e salva o agendamento no Firebase.
 */
async function confirmBooking() {
    const clientName = clientNameInput.value.trim();
    const clientContact = clientContactInput.value.trim(); // NOVO: Captura o valor do contato
    const selectedService = serviceSelect.value;
    const paymentMethod = paymentMethodSelect.value;
    const totalPrice = servicesList[selectedService]; // Pega o preço real do serviço

    // NOVO: Adiciona clientContact à validação inicial
    if (!selectedDate || !selectedTime || !clientName || !clientContact || !selectedService || !paymentMethod) {
        alert("Por favor, preencha todos os campos (Data, Hora, Nome, Contato, Serviço e Pagamento).");
        return;
    }

    const dateString = selectedDate.toISOString().split('T')[0]; // "YYYY-MM-DD"
    
    // Objeto de agendamento com todos os detalhes (incluindo contato)
    const newAppointment = {
        date: dateString,
        time: selectedTime,
        clientName: clientName,          
        clientContact: clientContact,    // NOVO: Inclui o contato no objeto
        service: selectedService,        
        paymentMethod: paymentMethod,    
        price: totalPrice,               
        timestamp: firebase.firestore.FieldValue.serverTimestamp() 
    };

    // Verificação dupla para evitar agendamentos simultâneos (race condition)
    try {
        const existingAppointments = await agendamentosRef
            .where('date', '==', dateString)
            .where('time', '==', selectedTime)
            .get();

        if (!existingAppointments.empty) {
            alert("Este horário já foi agendado por outra pessoa. Por favor, escolha outro.");
            await loadBookedAppointments(selectedDate); // Recarrega os horários para refletir a mudança
            return;
        }

        await agendamentosRef.add(newAppointment);
        alert(`Agendamento de ${clientName} (${clientContact}) para ${selectedService} confirmado para ${selectedDate.toLocaleDateString('pt-BR')} às ${selectedTime}!\nValor Total: R$ ${totalPrice.toFixed(2).replace('.', ',')}\nForma de Pagamento: ${paymentMethod}`);
        
        // --- RESETANDO O ESTADO APÓS AGENDAMENTO ---
        await loadBookedAppointments(selectedDate); // Recarrega os horários para mostrar o novo agendamento como indisponível
        
        selectedTime = null; // Limpa seleção de horário
        selectedDateTimeSpan.textContent = '';
        bookingDetailsDiv.style.display = 'none'; // Esconde o formulário de detalhes
        clientNameInput.value = '';             // Limpa o nome
        clientContactInput.value = '';          // NOVO: Limpa o campo de contato
        serviceSelect.value = '';               // Reseta o serviço para a opção "Selecione..."
        paymentMethodSelect.value = '';         // Reseta o pagamento para a opção "Selecione..."
        totalPriceSpan.textContent = 'R$ 0,00'; // Reseta o total
        confirmBookingBtn.disabled = true;      // Desabilita o botão de confirmação

    } catch (error) {
        console.error("Erro ao confirmar agendamento: ", error);
        alert("Ocorreu um erro ao confirmar seu agendamento. Por favor, tente novamente.");
    }
}

// ==========================================================
// 8. LISTENERS DE EVENTOS
// ==========================================================

// Listeners para navegação do calendário
prevMonthBtn.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
});

nextMonthBtn.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
});

// Listener para o botão de confirmação de agendamento
confirmBookingBtn.addEventListener('click', confirmBooking);

// LISTENERS PARA OS CAMPOS DO NOVO FORMULÁRIO DE DETALHES
clientNameInput.addEventListener('input', updateConfirmationState);
clientContactInput.addEventListener('input', updateConfirmationState); // NOVO LISTENER
serviceSelect.addEventListener('change', updateConfirmationState);
paymentMethodSelect.addEventListener('change', updateConfirmationState);

// ==========================================================
// 9. INICIALIZAÇÃO
// ==========================================================
// Renderiza o calendário ao carregar a página pela primeira vez
renderCalendar();