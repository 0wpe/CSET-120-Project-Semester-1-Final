function loadReceipt(){
    const raw = localStorage.getItem("checkoutReceipt");

    if (!raw) {
        document.getElementById("receiptCard").innerHTML = `
            <h1>No Receipt Found</h1>
            <p class="small">You haven't made a purchase yet.<br><br>
            <a href="index.html">Return to the menu</a></p>
        `;
        return;
    }

    const receipt = JSON.parse(raw);

    // Set date
    const date = new Date(receipt.date);
    document.getElementById("orderDate").innerText = date.toLocaleString();

    // Items list
    const container = document.getElementById("itemsList");
    container.innerHTML = "";

    receipt.items.forEach(item => {
        const row = document.createElement("div");
        row.classList.add("item-row");
        row.innerHTML = `
            <div>
                <strong>${item.name}</strong>
                <div style="font-size: 13px; color: #666;">x${item.quantity} @ ${item.price.toFixed(2)}</div>
            </div>
            <div>${item.lineTotal.toFixed(2)}</div>
        `;
        container.appendChild(row);
    });

    // Totals
    document.getElementById("r-subtotal").innerText = `${receipt.subtotal.toFixed(2)}`;
    document.getElementById("r-tax").innerText = `${receipt.tax.toFixed(2)}`;
    document.getElementById("r-total").innerText = `${receipt.total.toFixed(2)}`;

    // Buttons
    document.getElementById("printBtn").addEventListener("click", () => window.print());
    document.getElementById("backBtn").addEventListener("click", () => window.location.href = "index.html");
};

// Ensure the receipt renders after the DOM is ready
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadReceipt);
} else {
    loadReceipt();
}