import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Avatar, personInitial } from "../components/Avatar";
import { Notch, fieldClass } from "../components/OutlinedField";
import { SessionExpiredNotice } from "../components/SessionExpiredNotice";
import { useAuth } from "../context/AuthContext";
import { fetchPermissions, type PermissionInfo } from "../lib/aswaqApi";
import { latinDigits } from "../lib/quantity";
import {
  ApiError,
  SessionExpiredError,
  deleteEmployee,
  fetchEmployees,
  postEmployee,
  putEmployeePermissions,
  searchUsers,
  type Employee,
  type UserMatch,
} from "../lib/waslaApi";

/** الإيميل كامل، أو الرقم كامل، أو ٣ حروف من الاسم — زي وصلة */
const searchable = (q: string) =>
  /\S+@\S+\.\S+/.test(q) ||
  latinDigits(q).replace(/[\s+-]/g, "").length >= 8 ||
  [...q.trim()].length >= 3;

const jobLabel = (e: Employee) => (e.owner ? "صاحب الشركة" : e.job);

/**
 * «الموظفين» بطلب العميل (مكالمة ١ أكتوبر) — زي «إدارة أصناف المتاجر»: بدوّر على
 * مستخدم (بالاسم أو الإيميل أو الرقم) وأضيفه للنشاط بوظيفته. كل موظف بيدخل
 * بحسابه هو، والنشاط بيظهر له في «شركاتي». الموظفين متسجّلين في وصلة
 * (business_employees)، وصاحب النشاط أولهم.
 *
 * إضافة وشيل الموظفين لصاحب الشركة بس، والموظف بيشوف الليستة وبس.
 *
 * الصلاحيات (مكالمة ٢ أكتوبر): من رصيد أسواق، متقسمة بالأقسام (مبيعات…). صاحب
 * الشركة بيفتح ويقفل لكل موظف — صلاحية صلاحية أو القسم كله — وبتتحفظ على طول.
 * الموظف الجديد بياخد اللي بيتفتح لوحده (defaultOn): «اللي يعطّل الشغل اعمله true».
 *
 * ٧ أكتوبر: الوظيفة لازم تتكتب قبل «إضافة» — كانت فاضية بتتسجّل «موظف». ووصلة
 * كمان بترفض الفاضية.
 */
export function EmployeesPage() {
  const { accountId = "" } = useParams<{ accountId: string }>();
  const { user, businesses, businessesLoading, withToken, sessionExpired } =
    useAuth();
  const business = businesses.find((b) => b.accountId === accountId);
  const isOwner = (business?.job ?? "owner") === "owner";

  /** null = لسه بنجيب */
  const [employees, setEmployees] = useState<Employee[] | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  /** null = مفيش بحث، 'loading' = بندوّر */
  const [matches, setMatches] = useState<UserMatch[] | "loading" | null>(null);
  const [picked, setPicked] = useState<UserMatch | null>(null);
  const [job, setJob] = useState("");
  /** داس «إضافة» والوظيفة فاضية */
  const [jobMissing, setJobMissing] = useState(false);
  const jobRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [confirmingId, setConfirmingId] = useState("");
  /** رصيد الصلاحيات وأسماء الأقسام — null = لسه بنجيب */
  const [catalog, setCatalog] = useState<{
    permissions: PermissionInfo[];
    categories: Record<string, string>;
  } | null>(null);
  /** الموظف اللي صلاحياته مفتوحة */
  const [permsOf, setPermsOf] = useState("");

  useEffect(() => {
    if (!user || sessionExpired || !business) return;
    let cancelled = false;
    withToken((token) => fetchEmployees(token, accountId))
      .then((list) => {
        if (!cancelled) setEmployees(list);
      })
      .catch((err: unknown) => {
        if (cancelled || err instanceof SessionExpiredError) return;
        setEmployees([]);
        setError(
          err instanceof ApiError ? err.message : "مقدرناش نجيب الموظفين.",
        );
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId, user, sessionExpired, Boolean(business), withToken]);

  useEffect(() => {
    if (!user || sessionExpired) return;
    let cancelled = false;
    withToken((token) => fetchPermissions(token))
      .then((c) => {
        if (!cancelled) setCatalog(c);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [user, sessionExpired, withToken]);

  // البحث بيستنى نص ثانية من غير كتابة
  useEffect(() => {
    const q = query.trim();
    if (!isOwner || !searchable(q)) {
      setMatches(null);
      return;
    }
    setMatches("loading");
    let cancelled = false;
    const timer = setTimeout(() => {
      withToken((token) =>
        searchUsers(
          token,
          accountId,
          q.includes("@") || /[\p{L}]/u.test(q)
            ? q
            : latinDigits(q).replace(/[\s-]/g, ""),
        ),
      )
        .then((found) => {
          if (!cancelled) setMatches(found);
        })
        .catch(() => {
          if (!cancelled) setMatches([]);
        });
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, accountId, isOwner, withToken]);

  async function handleAdd() {
    if (!picked || saving) return;
    if (!job.trim()) {
      setJobMissing(true);
      jobRef.current?.focus();
      return;
    }
    setSaving(true);
    setError("");
    try {
      const defaults = (catalog?.permissions ?? [])
        .filter((p) => p.defaultOn)
        .map((p) => p.key);
      setEmployees(
        await withToken((token) =>
          postEmployee(
            token,
            accountId,
            picked.accountId,
            job.trim(),
            defaults,
          ),
        ),
      );
      setPicked(null);
      setJob("");
      setQuery("");
    } catch (err) {
      if (err instanceof SessionExpiredError) return;
      setError(
        err instanceof ApiError && err.status === 409
          ? "ده موظف في الشركة بالفعل."
          : err instanceof ApiError
            ? err.message
            : "مقدرناش نضيف الموظف.",
      );
    } finally {
      setSaving(false);
    }
  }

  /** صلاحيات موظف — بتتحفظ مع كل دوسة، والليستة بترجع من وصلة */
  async function savePermissions(employee: Employee, permissions: string[]) {
    setError("");
    setEmployees(
      (prev) =>
        prev?.map((e) =>
          e.accountId === employee.accountId ? { ...e, permissions } : e,
        ) ?? prev,
    );
    try {
      setEmployees(
        await withToken((token) =>
          putEmployeePermissions(
            token,
            accountId,
            employee.accountId,
            permissions,
          ),
        ),
      );
    } catch (err) {
      if (err instanceof SessionExpiredError) return;
      setEmployees(
        (prev) =>
          prev?.map((e) =>
            e.accountId === employee.accountId ? employee : e,
          ) ?? prev,
      );
      setError(
        err instanceof ApiError ? err.message : "مقدرناش نحفظ الصلاحيات.",
      );
    }
  }

  async function handleRemove(employee: Employee) {
    setSaving(true);
    setError("");
    try {
      setEmployees(
        await withToken((token) =>
          deleteEmployee(token, accountId, employee.accountId),
        ),
      );
      setConfirmingId("");
    } catch (err) {
      if (!(err instanceof SessionExpiredError))
        setError(
          err instanceof ApiError ? err.message : "مقدرناش نشيل الموظف.",
        );
    } finally {
      setSaving(false);
    }
  }

  if (!user) {
    return (
      <p className="mx-auto max-w-md px-4 py-20 text-center text-sm text-gray-500 dark:text-gray-400">
        سجّل دخولك الأول.
      </p>
    );
  }
  if (!business) {
    return (
      <p className="mx-auto max-w-md px-4 py-20 text-center text-sm text-gray-500 dark:text-gray-400">
        {businessesLoading ? "بنجيب النشاط…" : "النشاط ده مش موجود."}
      </p>
    );
  }

  const already = new Set((employees ?? []).map((e) => e.accountId));

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="font-display text-2xl font-bold sm:text-3xl">الموظفين</h1>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
        لنشاط{" "}
        <span className="font-semibold text-gray-700 dark:text-gray-200">
          {business.name}
        </span>
      </p>

      <div className="mt-6">
        <SessionExpiredNotice />
      </div>

      {error && (
        <p
          role="alert"
          className="mb-5 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300"
        >
          {error}
        </p>
      )}

      {isOwner ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-surface-card">
          {/* gap أوسع من العادي: اسم كل خانة طالع فوق حدّها بـ٨ بكسل */}
          <div className="grid gap-5">
            <label className="relative block">
              <input
                className={fieldClass}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPicked(null);
                }}
                dir="auto"
                placeholder="الاسم، أو الإيميل أو الرقم كامل"
              />
              <Notch>دوّر على مستخدم</Notch>
            </label>

            {!picked && query.trim() && (
              <div>
                {matches === "loading" || matches === null ? (
                  <p className="text-xs text-gray-400">
                    {matches === "loading"
                      ? "بندوّر…"
                      : "كمّل الاسم (٣ حروف) أو الإيميل أو الرقم."}
                  </p>
                ) : matches.length === 0 ? (
                  <p className="text-xs text-gray-400">مفيش مستخدم كده.</p>
                ) : (
                  <ul
                    aria-label="نتايج البحث"
                    className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 dark:divide-white/5 dark:border-white/10"
                  >
                    {matches.map((m) => (
                      <li key={m.accountId}>
                        <button
                          type="button"
                          disabled={already.has(m.accountId)}
                          onClick={() => {
                            setPicked(m);
                            setJobMissing(false);
                          }}
                          className="flex w-full items-center gap-3 px-3 py-2.5 text-start text-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-white/5"
                        >
                          <Avatar
                            picture={m.picture}
                            fallback={personInitial(m.name, undefined)}
                            kind="person"
                            size={28}
                            tone="soft"
                          />
                          <span className="min-w-0 flex-1 truncate">
                            {m.name}
                          </span>
                          {already.has(m.accountId) && (
                            <span className="shrink-0 text-xs text-gray-400">
                              موظف بالفعل
                            </span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {picked && (
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <Avatar
                    picture={picked.picture}
                    fallback={personInitial(picked.name, undefined)}
                    kind="person"
                    size={32}
                    tone="soft"
                  />
                  <span className="truncate font-semibold">{picked.name}</span>
                </div>
                <label className="relative block w-40">
                  <input
                    ref={jobRef}
                    // ! عشان الأحمر يغلب لون التركيز (الخانة بتاخد الفوكس مع الرسالة)
                    className={`${fieldClass} ${jobMissing ? "!border-red-500 focus:!ring-red-500 dark:!border-red-400" : ""}`}
                    value={job}
                    onChange={(e) => {
                      setJob(e.target.value);
                      setJobMissing(false);
                    }}
                    placeholder="مثال: محاسب"
                    maxLength={40}
                    required
                    aria-invalid={jobMissing}
                    aria-describedby={jobMissing ? "job-missing" : undefined}
                  />
                  <Notch>الوظيفة</Notch>
                </label>
                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={saving}
                  className="rounded-xl bg-brand-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-70"
                >
                  {saving ? "بنضيف…" : "إضافة"}
                </button>
              </div>
            )}
            {picked && jobMissing && (
              <p id="job-missing" role="alert" className="-mt-2 text-sm text-red-600 dark:text-red-400">
                اكتب وظيفته الأول — مثلاً «محاسب» أو «بياع».
              </p>
            )}
          </div>
        </div>
      ) : (
        <p className="rounded-xl bg-gray-100 px-4 py-3 text-sm text-gray-600 dark:bg-white/5 dark:text-gray-300">
          صاحب الشركة بس اللي بيضيف ويشيل الموظفين.
        </p>
      )}

      <h2 className="mt-8 font-display text-lg font-bold">
        الموظفين{" "}
        {employees !== null && (
          <span className="text-sm font-normal text-gray-400">
            {employees.length}
          </span>
        )}
      </h2>
      {employees === null ? (
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
          بنجيب الموظفين…
        </p>
      ) : (
        <ul aria-label="موظفين الشركة" className="mt-3 space-y-2">
          {employees.map((e) => (
            <li
              key={e.accountId}
              className="rounded-2xl border border-gray-200 bg-white p-3 dark:border-white/10 dark:bg-surface-card"
            >
              <div className="flex items-center gap-3">
                <Avatar
                  picture={e.picture}
                  fallback={personInitial(e.name, undefined)}
                  kind="person"
                  size={36}
                  tone="soft"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{e.name}</span>
                  <span className="block truncate text-xs text-gray-500 dark:text-gray-400">
                    {jobLabel(e)}
                    {catalog && !e.owner && (
                      <span className="tabular-nums">
                        {" "}
                        ·{" "}
                        {
                          (e.permissions ?? []).filter((k) =>
                            catalog.permissions.some((p) => p.key === k),
                          ).length
                        }{" "}
                        من {catalog.permissions.length} صلاحيات
                      </span>
                    )}
                  </span>
                </span>
                {isOwner && !e.owner && catalog && (
                  <button
                    type="button"
                    aria-expanded={permsOf === e.accountId}
                    onClick={() =>
                      setPermsOf((v) => (v === e.accountId ? "" : e.accountId))
                    }
                    className="shrink-0 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium transition hover:border-gray-400 dark:border-white/15"
                  >
                    الصلاحيات
                  </button>
                )}
                {isOwner &&
                  !e.owner &&
                  (confirmingId === e.accountId ? (
                    <span className="flex shrink-0 items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleRemove(e)}
                        disabled={saving}
                        className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-70"
                      >
                        شيل
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmingId("")}
                        className="rounded-lg px-2 py-1.5 text-xs text-gray-500 dark:text-gray-400"
                      >
                        رجوع
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmingId(e.accountId)}
                      className="shrink-0 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:border-red-300 dark:border-white/15 dark:text-red-300"
                    >
                      شيل
                    </button>
                  ))}
              </div>
              {permsOf === e.accountId && catalog && (
                <PermissionsPanel
                  employee={e}
                  catalog={catalog}
                  onChange={(permissions) => savePermissions(e, permissions)}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * صلاحيات موظف متقسمة بالأقسام — كل قسم ليه «الكل» يفتح أو يقفل اللي فيه مرة
 * واحدة (صاحب الشركة بيعيّن محاسب فيفتحله «حسابات» كلها). الصلاحية اللي في
 * أكتر من قسم بتظهر في كل واحد منهم.
 */
function PermissionsPanel({
  employee,
  catalog,
  onChange,
}: {
  employee: Employee;
  catalog: {
    permissions: PermissionInfo[];
    categories: Record<string, string>;
  };
  onChange: (permissions: string[]) => void;
}) {
  const on = new Set(employee.permissions ?? []);
  const categories = [
    ...new Set(catalog.permissions.flatMap((p) => p.categories)),
  ];
  const toggle = (keys: string[], value: boolean) => {
    const next = new Set(on);
    for (const k of keys) {
      if (value) next.add(k);
      else next.delete(k);
    }
    onChange([...next]);
  };

  return (
    <div
      aria-label={`صلاحيات ${employee.name}`}
      className="mt-3 space-y-3 border-t border-gray-100 pt-3 dark:border-white/5"
    >
      {categories.map((category) => {
        const inCategory = catalog.permissions.filter((p) =>
          p.categories.includes(category),
        );
        const all = inCategory.every((p) => on.has(p.key));
        return (
          <fieldset key={category} className="space-y-1.5">
            <legend className="flex w-full items-center justify-between gap-2 text-sm font-bold">
              <span>{catalog.categories[category] ?? category}</span>
              <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
                <input
                  type="checkbox"
                  checked={all}
                  onChange={(ev) =>
                    toggle(
                      inCategory.map((p) => p.key),
                      ev.target.checked,
                    )
                  }
                  className="h-4 w-4 accent-brand-600"
                />
                الكل
              </label>
            </legend>
            {inCategory.map((p) => (
              <label
                key={p.key}
                className="flex items-center gap-2.5 rounded-lg px-1 py-1 text-sm"
              >
                <input
                  type="checkbox"
                  checked={on.has(p.key)}
                  onChange={(ev) => toggle([p.key], ev.target.checked)}
                  className="h-4 w-4 shrink-0 accent-brand-600"
                />
                <span className="min-w-0 flex-1">{p.name}</span>
              </label>
            ))}
          </fieldset>
        );
      })}
    </div>
  );
}
