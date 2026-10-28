
const STORAGE_KEY = "securebank_demo_v1";

function loadData() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return {
      customers: Array.isArray(data.customers) ? data.customers : [],
      transactions: Array.isArray(data.transactions)
        ? data.transactions
        : []
    };
  } catch {
    return { customers: [], transactions: [] };
  }
}

const state = loadData();
let customers = state.customers;
let transactions = state.transactions;

const $ = (id) => document.getElementById(id);

const money = (amount) =>
  Number(amount).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR"
  });

const safe = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);

function saveData() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ customers, transactions })
    );
    return true;
  } catch {
    alert("Could not save data. Browser storage may be full or disabled.");
    return false;
  }
}

function render() {
  $("totalCustomers").textContent = customers.length;

  $("totalBalance").textContent = money(
    customers.reduce((sum, customer) =>
      sum + Number(customer.balance || 0), 0)
  );

  $("totalTransactions").textContent = transactions.length;

  renderCustomers();
  renderAccountOptions();
  renderTransactions();
}

function renderCustomers() {
  const search = $("search").value.trim().toLowerCase();

  const filtered = customers.filter((customer) =>
    [customer.name, customer.email, customer.phone, customer.account]
      .some((value) => String(value).toLowerCase().includes(search))
  );

  $("customerTable").innerHTML = filtered.map((customer) => `
    <tr>
      <td>${safe(customer.account)}</td>
      <td>${safe(customer.name)}</td>
      <td>${safe(customer.email)}</td>
      <td>${money(customer.balance)}</td>
      <td>
        <button class="small edit-btn" data-id="${safe(customer.id)}">
          Edit
        </button>
        <button class="small danger delete-btn"
                data-id="${safe(customer.id)}">
          Delete
        </button>
      </td>
    </tr>
  `).join("");

  $("emptyMessage").classList.toggle("hidden", filtered.length > 0);
}

function renderAccountOptions() {
  const previous = $("accountSelect").value;

  $("accountSelect").innerHTML =
    '<option value="">Select a customer</option>' +
    customers.map((customer) => `
      <option value="${safe(customer.id)}">
        ${safe(customer.name)} — ${safe(customer.account)}
      </option>
    `).join("");

  if (customers.some((customer) => customer.id === previous)) {
    $("accountSelect").value = previous;
  }
}

function renderTransactions() {
  $("transactionTable").innerHTML = transactions
    .slice()
    .reverse()
    .map((transaction) => `
      <tr>
        <td>${safe(transaction.date)}</td>
        <td>${safe(transaction.account)}</td>
        <td>
          <span>${transaction.type === "deposit"
            ? "Deposit" : "Withdrawal"}</span>
        </td>
        <td>${money(transaction.amount)}</td>
      </tr>
    `).join("");

  $("transactionEmpty").classList.toggle(
    "hidden", transactions.length > 0
  );
}

function resetForm() {
  $("customerForm").reset();
  $("customerId").value = "";
  $("balance").value = "0";
  $("formTitle").textContent = "Add Customer";
  $("saveBtn").textContent = "Add Customer";
  $("cancelBtn").classList.add("hidden");
}

$("customerForm").addEventListener("submit", (event) => {
  event.preventDefault();

  const id = $("customerId").value;
  const name = $("name").value.trim();
  const email = $("email").value.trim();
  const phone = $("phone").value.trim();
  const balanceInput = $("balance").value;

  const balance = Math.round(Number(balanceInput) * 100) / 100;

  if (!name || !email || !phone) {
    alert("Please fill in all customer fields.");
    return;
  }

  if (
    balanceInput.trim() === "" ||
    !Number.isFinite(balance) ||
    balance < 0 ||
    balance > 100000000
  ) {
    alert("Enter a valid initial balance.");
    return;
  }

  const duplicate = customers.some((customer) =>
    customer.email.toLowerCase() === email.toLowerCase() &&
    customer.id !== id
  );

  if (duplicate) {
    alert("A customer with this email already exists.");
    return;
  }

  if (id) {
    const customer = customers.find((item) => item.id === id);

    if (!customer) {
      alert("Customer not found.");
      return;
    }

    // Editing customer details must not change account balance.
    customer.name = name;
    customer.email = email;
    customer.phone = phone;
  } else {
    const newCustomer = {
      id: crypto.randomUUID(),
      account: "SB" + Date.now().toString().slice(-10),
      name,
      email,
      phone,
      balance
    };

    customers.push(newCustomer);

    if (balance > 0) {
      transactions.push({
        id: crypto.randomUUID(),
        account: newCustomer.account,
        type: "deposit",
        amount: balance,
        date: new Date().toLocaleString()
      });
    }
  }

  if (!saveData()) {
    // Reload the last saved state if persistence fails.
    const saved = loadData();
    customers = saved.customers;
    transactions = saved.transactions;
    render();
    return;
  }

  resetForm();
  render();
});

$("customerTable").addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;

  const customer = customers.find(
    (item) => item.id === button.dataset.id
  );

  if (!customer) return;

  if (button.classList.contains("edit-btn")) {
    $("customerId").value = customer.id;
    $("name").value = customer.name;
    $("email").value = customer.email;
    $("phone").value = customer.phone;

    // Balance is deliberately not editable through this form.
    $("balance").value = "0";
    $("balance").disabled = true;

    $("formTitle").textContent = "Edit Customer";
    $("saveBtn").textContent = "Update Customer";
    $("cancelBtn").classList.remove("hidden");

    $("customers").scrollIntoView({ behavior: "smooth" });
    return;
  }

  if (button.classList.contains("delete-btn")) {
    const confirmed = confirm(
      `Delete ${customer.name}? This cannot be undone.`
    );

    if (!confirmed) return;

    const oldCustomers = customers;
    const oldTransactions = transactions;

    customers = customers.filter((item) => item.id !== customer.id);

    // Keep transaction history for audit/demo purposes.
    if (!saveData()) {
      customers = oldCustomers;
      transactions = oldTransactions;
      return;
    }

    resetForm();
    render();
  }
});

$("cancelBtn").addEventListener("click", () => {
  $("balance").disabled = false;
  resetForm();
});

$("search").addEventListener("input", renderCustomers);

$("transactionForm").addEventListener("submit", (event) => {
  event.preventDefault();

  const customerId = $("accountSelect").value;
  const type = $("transactionType").value;
  const amountInput = $("amount").value;
  const amount = Math.round(Number(amountInput) * 100) / 100;

  const customer = customers.find(
    (item) => item.id === customerId
  );

  if (!customer) {
    alert("Please select a valid customer.");
    return;
  }

  if (
    amountInput.trim() === "" ||
    !Number.isFinite(amount) ||
    amount <= 0 ||
    amount > 100000000
  ) {
    alert("Enter a valid transaction amount.");
    return;
  }

  if (type === "withdraw" && amount > customer.balance) {
    alert("Insufficient balance.");
    return;
  }

  const previousBalance = customer.balance;

  customer.balance = Math.round(
    (type === "deposit"
      ? customer.balance + amount
      : customer.balance - amount) * 100
  ) / 100;

  transactions.push({
    id: crypto.randomUUID(),
    account: customer.account,
    type,
    amount,
    date: new Date().toLocaleString()
  });

  if (!saveData()) {
    customer.balance = previousBalance;
    transactions.pop();
    render();
    return;
  }

  $("transactionForm").reset();
  render();

  alert(
    `${type === "deposit" ? "Deposit" : "Withdrawal"} successful. ` +
    `New balance: ${money(customer.balance)}`
  );
});

// Ensure the balance field is enabled when starting a new record.
const originalResetForm = resetForm;
resetForm = function () {
  $("balance").disabled = false;
  originalResetForm();
};

render();
