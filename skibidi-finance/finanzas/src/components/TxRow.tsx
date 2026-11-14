import type { Transaction } from '../types';
import { categoryColor } from '../lib/constants';
import { fmtDate, fmtMoney } from '../lib/format';
import { Icon, cx } from './ui';

export default function TxRow({
  tx,
  onEdit,
  onDelete,
}: {
  tx: Transaction;
  onEdit?: (t: Transaction) => void;
  onDelete?: (t: Transaction) => void;
}) {
  const income = tx.type === 'ingreso';
  const color = categoryColor(tx.category);
  return (
    <li className="flex items-center gap-3 py-2.5">
      <span
        className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sm font-semibold"
        style={{ background: `${color}26`, color }}
      >
        {tx.category.charAt(0)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{tx.description || tx.category}</p>
        <p className="truncate text-xs text-muted">
          {tx.category} · {fmtDate(tx.date)}
        </p>
      </div>
      <p className={cx('shrink-0 text-sm font-semibold tabular-nums', income && 'text-accent')}>
        {income ? '+' : '−'}
        {fmtMoney(tx.amount)}
      </p>
      {(onEdit || onDelete) && (
        <div className="flex shrink-0">
          {onEdit && (
            <button className="btn-icon" onClick={() => onEdit(tx)} aria-label="Editar movimiento">
              <Icon name="edit" />
            </button>
          )}
          {onDelete && (
            <button className="btn-icon hover:text-danger" onClick={() => onDelete(tx)} aria-label="Eliminar movimiento">
              <Icon name="trash" />
            </button>
          )}
        </div>
      )}
    </li>
  );
}
