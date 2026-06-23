import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="bg-seraya-ivory grid min-h-screen place-items-center px-6 py-12">
      <div className="max-w-md text-center">
        <p className="text-seraya-rosewood text-sm font-semibold tracking-[0.16em] uppercase">
          404
        </p>
        <h1 className="text-seraya-ink mt-4 font-serif text-4xl">Halaman tidak ditemukan.</h1>
        <p className="text-seraya-muted mt-4 leading-7">
          Halaman yang kamu cari belum tersedia atau sudah tidak dapat diakses.
        </p>
        <Link
          className="bg-seraya-rosewood mt-8 inline-flex rounded-xl px-5 py-3 text-sm font-semibold text-white"
          href="/"
        >
          Kembali ke Seraya
        </Link>
      </div>
    </main>
  );
}
