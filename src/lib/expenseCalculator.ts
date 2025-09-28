export interface PaymentCalculationResult {
  member: string;
  pending: number;
  status: 'owes' | 'receives' | 'settled';
}

export interface MemberPayment {
  [memberName: string]: number;
}

export interface AdminPaymentResult {
  member: string;
  owesToAdmin: number;
  status: 'owes' | 'receives' | 'settled';
}

export function calculatePending(
  totalBill: number, 
  memberPayments: MemberPayment
): PaymentCalculationResult[] {
  const numMembers = Object.keys(memberPayments).length;
  const splitAmount = totalBill / numMembers; // K/N
  const results: PaymentCalculationResult[] = [];

  for (let member in memberPayments) {
    const amountPaid = memberPayments[member]; // z
    const remainingAmount = splitAmount - amountPaid; // (K/N) - z
    
    let status: 'owes' | 'receives' | 'settled' = 'settled';
    if (remainingAmount > 0.01) {
      status = 'owes'; // They need to pay more
    } else if (remainingAmount < -0.01) {
      status = 'receives'; // They should get money back
    }

    results.push({
      member,
      pending: Math.abs(remainingAmount),
      status
    });
  }

  return results;
}

export function calculateAdminPayback(
  totalBill: number,
  adminName: string,
  memberContributions: MemberPayment
): AdminPaymentResult[] {
  const allMembers = Object.keys(memberContributions);
  const totalMembers = allMembers.length;
  const equalShare = totalBill / totalMembers;
  const results: AdminPaymentResult[] = [];

  for (let member of allMembers) {
    if (member === adminName) {
      // Admin doesn't owe themselves
      results.push({
        member,
        owesToAdmin: 0,
        status: 'settled'
      });
      continue;
    }

    const contributed = memberContributions[member];
    const owesToAdmin = equalShare - contributed;
    
    let status: 'owes' | 'receives' | 'settled' = 'settled';
    if (owesToAdmin > 0.01) { // Small threshold for floating point precision
      status = 'owes';
    } else if (owesToAdmin < -0.01) {
      status = 'receives';
    }

    results.push({
      member,
      owesToAdmin: Math.abs(owesToAdmin),
      status
    });
  }

  return results;
}

export function generatePaymentMessage(result: PaymentCalculationResult): string {
  const { member, pending, status } = result;
  
  switch (status) {
    case 'owes':
      return `Mail reminder to ${member}: You still need to pay ₹${pending.toFixed(2)} for your share`;
    case 'receives':
      return `Mail reminder to ${member}: You will receive ₹${pending.toFixed(2)} back (you overpaid)`;
    case 'settled':
      return `Mail reminder to ${member}: You are settled up, no payment needed - thank you!`;
    default:
      return '';
  }
}

export function generateAllPaymentReminders(results: PaymentCalculationResult[]): string[] {
  return results.map(result => generatePaymentMessage(result));
}

export function generateAdminPaymentMessage(result: AdminPaymentResult, adminName: string): string {
  const { member, owesToAdmin, status } = result;
  
  if (member === adminName) {
    return `${adminName}: You paid the full bill and will receive payments from others`;
  }
  
  switch (status) {
    case 'owes':
      return `Mail to ${member}: You need to pay ₹${owesToAdmin.toFixed(2)} to ${adminName}`;
    case 'receives':
      return `Mail to ${member}: ${adminName} owes you ₹${owesToAdmin.toFixed(2)} back`;
    case 'settled':
      return `Mail to ${member}: You are settled up with ${adminName}, no payment needed`;
    default:
      return '';
  }
}