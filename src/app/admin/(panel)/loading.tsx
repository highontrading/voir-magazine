export default function AdminLoading() {
  return (
    <div className="adm-loading" aria-busy="true" aria-label="Loading">
      <div className="adm-skel adm-skel-title" />
      <div className="adm-skel adm-skel-sub" />
      <div className="adm-skel adm-skel-block" />
    </div>
  );
}
