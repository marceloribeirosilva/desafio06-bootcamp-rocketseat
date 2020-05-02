import { EntityRepository, Repository } from 'typeorm';

import Transaction from '../models/Transaction';

interface Balance {
  income: number;
  outcome: number;
  total: number;
}

interface ListTransactionsDTO {
  transactions: Transaction[];
  balance: Balance;
}

@EntityRepository(Transaction)
class TransactionsRepository extends Repository<Transaction> {
  public async getBalance(): Promise<Balance> {
    const transactions = await this.find();

    const incomeTotal = transactions
      .filter(transaction => transaction.type === 'income')
      .reduce((prev, cur) => {
        return prev + Number(cur.value);
      }, 0);

    const outcomeTotal = transactions
      .filter(transaction => transaction.type === 'outcome')
      .reduce((prev, cur) => {
        return prev + Number(cur.value);
      }, 0);

    return {
      income: incomeTotal,
      outcome: outcomeTotal,
      total: incomeTotal - outcomeTotal,
    };
  }

  public async all(): Promise<ListTransactionsDTO> {
    return {
      transactions: await this.find(),
      balance: await this.getBalance(),
    };
  }
}

export default TransactionsRepository;
