// Array para armazenar os itens da lista
let listaDeCompras = [];

// Seleciona elementos do DOM
const formAdicionar = document.getElementById('form-adicionar');
const tabelaItens = document.querySelector('#lista-itens tbody');
const spanValorTotal = document.getElementById('valor-total');

// ====================================
// FUNÇÕES DE PERSISTÊNCIA (localStorage)
// ====================================

function salvarLista() {
    // Converte o array JavaScript em uma string JSON para armazenamento
    const listaJSON = JSON.stringify(listaDeCompras);
    localStorage.setItem('supermercadoLista', listaJSON);
}

function carregarLista() {
    const listaJSON = localStorage.getItem('supermercadoLista');
    if (listaJSON) {
        listaDeCompras = JSON.parse(listaJSON);
        // Garante que os campos de valor e quantidade sejam do tipo número
        listaDeCompras.forEach(item => {
            if (typeof item.valorUnitario === 'string') {
                 item.valorUnitario = parseFloat(item.valorUnitario);
            }
            if (typeof item.quantidade === 'string') {
                item.quantidade = parseInt(item.quantidade);
            }
        });
    } 
}

// ====================================
// FUNÇÕES DE EDIÇÃO
// ====================================

function editarQuantidade(index, novoTexto) {
    // 1. Limpa e converte para número inteiro
    const quantidadeLimpa = novoTexto.trim().replace(',', '.');
    let novaQuantidade = parseInt(quantidadeLimpa);

    // 2. Validação
    if (isNaN(novaQuantidade) || novaQuantidade <= 0) {
        alert('Quantidade inválida. Por favor, insira um número inteiro maior que zero.');
        renderizarLista(); // Restaura o valor antigo
        return;
    }
    
    // 3. Atualiza, salva e renderiza
    listaDeCompras[index].quantidade = novaQuantidade;
    salvarLista(); 
    renderizarLista();
}

function editarValorUnitario(index, novoTexto) {
    // 1. Limpa e converte para float
    const valorLimpo = novoTexto.replace('R$', '').trim().replace(',', '.');
    let novoValor = parseFloat(valorLimpo);

    // 2. Validação
    if (isNaN(novoValor) || novoValor <= 0) {
        alert('Valor inválido. Por favor, insira um número maior que zero.');
        renderizarLista(); // Restaura o valor antigo
        return;
    }
    
    // Arredonda para duas casas decimais
    novoValor = parseFloat(novoValor.toFixed(2));

    // 3. Atualiza, salva e renderiza
    listaDeCompras[index].valorUnitario = novoValor;
    salvarLista(); 
    renderizarLista();
}

// ====================================
// FUNÇÕES DE RENDERIZAÇÃO E CÁLCULO
// ====================================

function calcularTotal() {
    const total = listaDeCompras.reduce((soma, item) => {
        // Calcula apenas o total dos itens AINDA NÃO comprados
        if (!item.comprado) {
            return soma + (item.quantidade * item.valorUnitario); 
        }
        return soma;
    }, 0); 
    // Formata o valor para Real (R$)
    spanValorTotal.textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;
}

function renderizarLista() {
    tabelaItens.innerHTML = ''; // Limpa a tabela

    listaDeCompras.forEach((item, index) => {
        const row = tabelaItens.insertRow();
        if (item.comprado) {
            row.classList.add('comprado');
        }

        // Célula 1: Comprado (Checkbox)
        const cellComprado = row.insertCell();
        cellComprado.setAttribute('data-label', 'Comprado');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = item.comprado;
        checkbox.addEventListener('change', () => toggleComprado(index)); 
        cellComprado.appendChild(checkbox);

        // Célula 2: Nome
        const cellNome = row.insertCell();
        cellNome.textContent = item.nome;
        cellNome.setAttribute('data-label', 'Item');

        // Célula 3: Quantidade (EDITÁVEL)
        const cellQtd = row.insertCell();
        cellQtd.setAttribute('data-label', 'Quantidade');
        cellQtd.classList.add('cell-editable');
        cellQtd.setAttribute('contenteditable', 'true');
        cellQtd.textContent = `${item.quantidade}`;
        // Listener de edição
        cellQtd.addEventListener('blur', (e) => {
             editarQuantidade(index, e.target.textContent);
        });


        // Célula 4: Valor Unitário (EDITÁVEL)
        const cellVUnit = row.insertCell();
        cellVUnit.setAttribute('data-label', 'Valor Unit. (R$)');
        cellVUnit.classList.add('cell-editable');
        cellVUnit.setAttribute('contenteditable', 'true');
        cellVUnit.textContent = item.valorUnitario.toFixed(2).replace('.', ',');
        // Listener de edição
        cellVUnit.addEventListener('blur', (e) => {
             editarValorUnitario(index, e.target.textContent);
        });

        // Célula 5: Valor Total (Calculado)
        const cellVTotal = row.insertCell();
        const valorTotalItem = item.quantidade * item.valorUnitario;
        cellVTotal.textContent = valorTotalItem.toFixed(2).replace('.', ',');
        cellVTotal.setAttribute('data-label', 'Total (R$)');

        // Célula 6: Ações (Remover)
        const cellAcoes = row.insertCell();
        cellAcoes.setAttribute('data-label', 'Ações');
        const btnRemover = document.createElement('button');
        btnRemover.textContent = 'Remover';
        btnRemover.addEventListener('click', () => removerItem(index)); 
        cellAcoes.appendChild(btnRemover);
    });

    calcularTotal();
}

// ====================================
// FUNÇÕES DE AÇÃO (Adicionar/Remover/Toggle)
// ====================================

function adicionarItem(e) {
    e.preventDefault(); 
    const nome = document.getElementById('item-nome').value.trim();
    const quantidade = parseInt(document.getElementById('item-quantidade').value);
    const valor = parseFloat(document.getElementById('item-valor').value);

    // Validação básica para evitar adicionar itens vazios
    if (!nome || isNaN(quantidade) || isNaN(valor) || quantidade <= 0 || valor <= 0) {
        alert("Por favor, preencha todos os campos com valores válidos.");
        return;
    }

    const novoItem = {
        nome: nome,
        quantidade: quantidade,
        valorUnitario: valor,
        comprado: false
    };

    listaDeCompras.push(novoItem);
    salvarLista(); 
    renderizarLista();
    formAdicionar.reset();
}

function removerItem(index) {
    listaDeCompras.splice(index, 1);
    salvarLista(); 
    renderizarLista();
}

function toggleComprado(index) {
    listaDeCompras[index].comprado = !listaDeCompras[index].comprado;
    salvarLista(); 
    renderizarLista();
}

// ====================================
// INICIALIZAÇÃO DA APLICAÇÃO
// ====================================

// Escutador de Evento para Adicionar
formAdicionar.addEventListener('submit', adicionarItem);

// 1. Carrega os dados salvos
carregarLista();
// 2. Desenha a lista na tela
renderizarLista();