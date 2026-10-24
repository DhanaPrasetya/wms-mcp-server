export enum OrderBy {
	asc = "asc",
	desc = "desc",
}

export enum Pagination {
	pageDefault = 1,
	limitDefault = 10,
	limitMax = 100,
}

export const rootAdminOnly: string[] = ["Root Admin"];
export const managerInventorySalesOnly: string[] = [
	"Manager",
	"Inventory Staff",
	"Sales Staff",
];
