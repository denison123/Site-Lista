// ==========================================================
// 1. CONFIGURAÇÃO E INICIALIZAÇÃO DO FIREBASE (Admin)
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
const db = app.firestore();
const auth = app.auth(); // Adiciona Firebase Authentication
const agendamentosRef = db.collection("agendamentos_barbearia");

// ==========================================================
// 2. ELEMENTOS DO DOM (Admin)
// ==========================================================

// Elementos de Login
const adminLoginSection = document.getElementById('adminLogin');
const adminEmailInput = document.getElementById('adminEmail');
const adminPasswordInput = document.getElementById('adminPassword');
const loginBtn = document.getElementById('loginBtn');
const loginError = document.getElementById('loginError');

// Elementos do Dashboard
const adminDashboardSection = document.getElementById('adminDashboard');
const logoutBtn = document.getElementById('logoutBtn');
const appointmentsList = document.getElementById('appointmentsList');
const prevDayBtn = document.getElementById('prevDayBtn');
const nextDayBtn = document.getElementById('nextDayBtn');
const currentAdminDate = document.getElementById('currentAdminDate');

// ==========================================================
// 3. VARIÁVEIS DE ESTADO (Admin)
// ==========================================================
let displayDate = new Date(); // Data que está sendo exibida no dashboard

// ==========================================================
// 4. FUNÇÕES DE AUTENTICAÇÃO
// ==========================================================

/**
 * Tenta fazer login do usuário (barbeiro).
 */
async function loginBarber() {
    const email = adminEmailInput.value;
    const password = adminPasswordInput.value;
    loginError.textContent = ''; // Limpa mensagens de erro

    if (!email || !password) {
        loginError.textContent = 'Por favor, insira e-mail e senha.';
        return;
    }

    try {
        await auth.signInWithEmailAndPassword(email, password);
        // Login bem-sucedido, onAuthStateChanged vai lidar com a exibição do dashboard
    } catch (error) {
        console.error("Erro no login:", error);
        // Mensagens de erro mais amigáveis
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
            loginError.textContent = 'E-mail ou senha incorretos.';
        } else if (error.code === 'auth/invalid-email') {
            loginError.textContent = 'Formato de e-mail inválido.';
        } else {
            loginError.textContent = 'Erro ao fazer login. Tente novamente.';
        }
    }
}

/**
 * Faz logout do usuário.
 */
async function logoutBarber() {
    try {
        await auth.signOut();
        // Logout bem-sucedido, onAuthStateChanged vai lidar com a exibição do login
    } catch (error) {
        console.error("Erro no logout:", error);
        alert("Não foi possível sair. Tente novamente.");
    }
}

/**
 * Monitora o estado da autenticação e alterna entre login e dashboard.
 */
auth.onAuthStateChanged(user => {
    if (user) {
        // Usuário logado
        adminLoginSection.style.display = 'none';
        adminDashboardSection.style.display = 'block';
        displayDate = new Date(); // Reset para o dia atual ao fazer login
        loadAppointments(displayDate);
    } else {
        // Usuário deslogado
        adminLoginSection.style.display = 'block';
        adminDashboardSection.style.display = 'none';
        appointmentsList.innerHTML = ''; // Limpa a lista
        adminEmailInput.value = '';
        adminPasswordInput.value = '';
        loginError.textContent = ''; // Limpa qualquer erro de login anterior
    }
});

// ==========================================================
// 5. FUNÇÕES DE EXIBIÇÃO DE AGENDAMENTOS
// ==========================================================

/**
 * Carrega e exibe os agendamentos para a data especificada.
 * @param {Date} date - A data para carregar os agendamentos.
 */
async function loadAppointments(date) {
    appointmentsList.innerHTML = '<p class="loading-message">Carregando agendamentos...</p>';
    currentAdminDate.textContent = date.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const dateString = date.toISOString().split('T')[0];

    try {
        const snapshot = await agendamentosRef
            .where('date', '==', dateString)
            .orderBy('time') // Ordena por horário (Requer índice composto no Firestore: date ASC, time ASC)
            .get();

        if (snapshot.empty) {
            appointmentsList.innerHTML = '<p class="no-appointments">Nenhum agendamento para esta data.</p>';
            return;
        }

        appointmentsList.innerHTML = ''; // Limpa a mensagem de carregamento
        snapshot.docs.forEach(doc => {
            const appointment = doc.data();

            // Adiciona verificações para campos que podem estar ausentes em agendamentos antigos
            const clientName = appointment.clientName || 'N/A';
            const clientContact = appointment.clientContact || 'Não informado'; // NOVO: Lida com agendamentos antigos sem contato
            const service = appointment.service || 'Não especificado';
            const paymentMethod = appointment.paymentMethod || 'Não informado';
            // Garante que 'price' seja um número para poder usar toFixed
            const price = typeof appointment.price === 'number' ? appointment.price : 0; 

            const appointmentItem = document.createElement('div');
            appointmentItem.classList.add('appointment-item');
            appointmentItem.innerHTML = `
                <p><strong>Hora:</strong> ${appointment.time}</p>
                <p><strong>Cliente:</strong> ${clientName}</p>
                <p><strong>Contato:</strong> ${clientContact}</p>
                <p><strong>Serviço:</strong> ${service}</p>
                <p><strong>Valor:</strong> R$ ${price.toFixed(2).replace('.', ',')}</p>
                <p><strong>Pagamento:</strong> ${paymentMethod}</p>
                <button class="delete-appointment-btn" data-id="${doc.id}">Excluir</button>
            `;
            appointmentsList.appendChild(appointmentItem);
        });

        // Adiciona listeners para os botões de excluir
        document.querySelectorAll('.delete-appointment-btn').forEach(button => {
            button.addEventListener('click', (event) => deleteAppointment(event.target.dataset.id));
        });

    } catch (error) {
        console.error("Erro ao carregar agendamentos do admin:", error);
        appointmentsList.innerHTML = '<p class="error-message">Erro ao carregar agendamentos. Verifique as permissões.</p>';
        // Se o erro for de permissão, pode ser útil fazer logout automático
        if (error.code === 'permission-denied') {
             alert('Acesso negado. Verifique as regras do Firestore ou seu status de login.');
             // logoutBarber(); // Descomente se quiser forçar o logout em caso de erro de permissão
        }
    }
}

/**
 * Exclui um agendamento do Firebase.
 * @param {string} id - O ID do documento do agendamento a ser excluído.
 */
async function deleteAppointment(id) {
    if (!confirm('Tem certeza que deseja excluir este agendamento?')) {
        return;
    }
    try {
        await agendamentosRef.doc(id).delete();
        alert('Agendamento excluído com sucesso!');
        loadAppointments(displayDate); // Recarrega a lista após exclusão
    } catch (error) {
        console.error("Erro ao excluir agendamento:", error);
        alert('Não foi possível excluir o agendamento. Tente novamente.');
    }
}

// ==========================================================
// 6. LISTENERS DE EVENTOS (Admin)
// ==========================================================

loginBtn.addEventListener('click', loginBarber);
logoutBtn.addEventListener('click', logoutBarber);

// Navegação de dias no dashboard
prevDayBtn.addEventListener('click', () => {
    displayDate.setDate(displayDate.getDate() - 1);
    loadAppointments(displayDate);
});

nextDayBtn.addEventListener('click', () => {
    displayDate.setDate(displayDate.getDate() + 1);
    loadAppointments(displayDate);
});

// Permite login ao pressionar Enter nos campos
adminEmailInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') loginBarber();
});
adminPasswordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') loginBarber();
});