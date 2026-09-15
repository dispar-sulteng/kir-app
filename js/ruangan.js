/* =========================================================================
   ruangan.js
   ========================================================================= */

requireLogin();
renderShell("ruangan", "Data Ruangan");

const grid = document.getElementById("ruangan-grid");
const modalRuangan = document.getElementById("modal-ruangan");
const formRuangan = document.getElementById("form-ruangan");
const modalRuanganTitle = document.getElementById("modal-ruangan-title");

async function renderGrid() {
  grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">Memuat data...</div>`;

  let list, barang;
  try {
    [list, barang] = await Promise.all([getRuanganList(), getInventarisList()]);
  } catch (err) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;color:var(--bad-text);">Gagal memuat data: ${escapeHtml(err.message)}</div>`;
    return;
  }

  if (list.length === 0) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">Belum ada data ruangan. Klik "Tambah Ruangan" untuk membuat data pertama.</div>`;
    return;
  }

  grid.innerHTML = list
    .map((r) => {
      const jumlahBarang = barang.filter((b) => b.ruanganId === r.id).length;
      return `
      <div class="card ruangan-card">
        <h3>${escapeHtml(r.nama)}</h3>
        <p>${escapeHtml(r.keterangan || "Tidak ada keterangan.")}</p>
        <span class="ruangan-meta">${jumlahBarang} jenis barang tercatat</span>
        <div class="col-actions">
          <button class="btn btn-secondary btn-sm" data-action="edit" data-id="${r.id}">Edit</button>
          <button class="btn btn-danger btn-sm" data-action="hapus" data-id="${r.id}">Hapus</button>
        </div>
      </div>`;
    })
    .join("");
}

function resetFormErrors() {
  document.getElementById("ruangan-nama").classList.remove("invalid");
  document.getElementById("err-ruangan-nama").classList.remove("show");
}

function openModalTambah() {
  resetFormErrors();
  formRuangan.reset();
  document.getElementById("ruangan-id").value = "";
  modalRuanganTitle.textContent = "Tambah Ruangan";
  modalRuangan.classList.add("show");
}

async function openModalEdit(id) {
  const r = await getRuanganById(id);
  if (!r) return;
  resetFormErrors();
  document.getElementById("ruangan-id").value = r.id;
  document.getElementById("ruangan-nama").value = r.nama;
  document.getElementById("ruangan-keterangan").value = r.keterangan || "";
  modalRuanganTitle.textContent = "Edit Ruangan";
  modalRuangan.classList.add("show");
}

function closeModal() {
  modalRuangan.classList.remove("show");
}

formRuangan.addEventListener("submit", async (e) => {
  e.preventDefault();
  resetFormErrors();

  const nama = document.getElementById("ruangan-nama").value.trim();
  if (!nama) {
    document.getElementById("ruangan-nama").classList.add("invalid");
    document.getElementById("err-ruangan-nama").classList.add("show");
    return;
  }

  const data = { nama, keterangan: document.getElementById("ruangan-keterangan").value.trim() };
  const id = document.getElementById("ruangan-id").value;
  const submitBtn = formRuangan.querySelector('button[type="submit"]');
  submitBtn.disabled = true;

  try {
    if (id) {
      await updateRuangan(id, data);
      showToast("Ruangan berhasil diperbarui.");
    } else {
      await addRuangan(data);
      showToast("Ruangan berhasil ditambahkan.");
    }
    closeModal();
    await renderGrid();
  } catch (err) {
    showToast(err.message, "danger");
  } finally {
    submitBtn.disabled = false;
  }
});

grid.addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;
  const id = btn.dataset.id;

  if (btn.dataset.action === "edit") openModalEdit(id);
  if (btn.dataset.action === "hapus") {
    const r = await getRuanganById(id);
    const dipakai = await isRuanganDipakai(id);
    if (dipakai) {
      showToast(`Ruangan "${r.nama}" masih memiliki data barang. Pindahkan atau hapus barang tersebut terlebih dahulu.`, "danger");
      return;
    }
    const konfirmasi = window.confirm(`Hapus ruangan "${r ? r.nama : ""}"?\n\nTindakan ini tidak dapat dibatalkan.`);
    if (konfirmasi) {
      try {
        await deleteRuangan(id);
        showToast("Ruangan berhasil dihapus.");
        await renderGrid();
      } catch (err) {
        showToast(err.message, "danger");
      }
    }
  }
});

document.getElementById("btn-tambah-ruangan").addEventListener("click", openModalTambah);
document.getElementById("modal-ruangan-close").addEventListener("click", closeModal);
document.getElementById("modal-ruangan-cancel").addEventListener("click", closeModal);

renderGrid();
