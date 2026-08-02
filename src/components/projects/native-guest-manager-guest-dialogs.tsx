'use client';

import { Button, Dialog } from '@/design-system';

import type { NativeGuestManagerController } from './native-guest-manager-controller';
import { GuestFields } from './native-guest-manager-shared';

export function NativeGuestManagerGuestDialogs({
  controller,
}: {
  controller: NativeGuestManagerController;
}) {
  const {
    addOpen,
    createAction,
    createPending,
    createState,
    editGuest,
    projectId,
    removeAction,
    removeGuest,
    removePending,
    removeState,
    setAddOpen,
    setEditGuest,
    setRemoveGuest,
    updateAction,
    updatePending,
    updateState,
  } = controller;

  return (
    <>
      <Dialog
        description="Tambahkan nama tamu dan jumlah undangan yang disiapkan."
        onOpenChange={setAddOpen}
        open={addOpen}
        title="Tambah tamu"
      >
        <form action={createAction} className="space-y-5" noValidate>
          <input name="projectId" type="hidden" value={projectId} />
          <GuestFields errors={createState.fieldErrors} />
          {createState.status === 'error' && createState.message ? (
            <p className="text-seraya-status-error text-sm leading-6" role="alert">
              {createState.message}
            </p>
          ) : null}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button onClick={() => setAddOpen(false)} type="button" variant="secondary">
              Batal
            </Button>
            <Button loading={createPending} type="submit">
              Simpan tamu
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog
        description="Perbarui detail tamu tanpa mengubah data project lainnya."
        onOpenChange={(open: boolean) => !open && setEditGuest(null)}
        open={Boolean(editGuest)}
        title="Edit tamu"
      >
        {editGuest ? (
          <form action={updateAction} className="space-y-5" key={editGuest.id} noValidate>
            <input name="guestId" type="hidden" value={editGuest.id} />
            <input name="projectId" type="hidden" value={projectId} />
            <GuestFields errors={updateState.fieldErrors} guest={editGuest} />
            {updateState.status === 'error' && updateState.message ? (
              <p className="text-seraya-status-error text-sm leading-6" role="alert">
                {updateState.message}
              </p>
            ) : null}
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button onClick={() => setEditGuest(null)} type="button" variant="secondary">
                Batal
              </Button>
              <Button loading={updatePending} type="submit">
                Simpan perubahan
              </Button>
            </div>
          </form>
        ) : null}
      </Dialog>
      <Dialog
        description={
          removeGuest
            ? `${removeGuest.display_name} akan dihapus dari daftar tamu aktif. Tautan pribadi aktifnya juga akan langsung dinonaktifkan.`
            : undefined
        }
        onOpenChange={(open: boolean) => !open && setRemoveGuest(null)}
        open={Boolean(removeGuest)}
        title="Hapus tamu?"
      >
        {removeGuest ? (
          <form action={removeAction} className="space-y-5">
            <input name="guestId" type="hidden" value={removeGuest.id} />
            <input name="projectId" type="hidden" value={projectId} />
            {removeState.status === 'error' && removeState.message ? (
              <p className="text-seraya-status-error text-sm leading-6" role="alert">
                {removeState.message}
              </p>
            ) : null}
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button onClick={() => setRemoveGuest(null)} type="button" variant="secondary">
                Batal
              </Button>
              <Button loading={removePending} type="submit" variant="danger">
                Hapus tamu
              </Button>
            </div>
          </form>
        ) : null}
      </Dialog>
    </>
  );
}
