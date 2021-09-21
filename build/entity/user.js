"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
const typeorm_1 = require("typeorm");
const transaction_1 = require("./transaction");
let User = class User {
};
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('increment'),
    __metadata("design:type", Number)
], User.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", default: null }),
    __metadata("design:type", String)
], User.prototype, "discordId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "int", default: 0 }),
    __metadata("design:type", Number)
], User.prototype, "amount", void 0);
__decorate([
    (0, typeorm_1.OneToMany)((type) => transaction_1.Transaction, (t) => t.fromUser),
    __metadata("design:type", Array)
], User.prototype, "sendTransaction", void 0);
__decorate([
    (0, typeorm_1.OneToMany)((type) => transaction_1.Transaction, (t) => t.toUser),
    __metadata("design:type", Array)
], User.prototype, "receiveTransaction", void 0);
User = __decorate([
    (0, typeorm_1.Entity)("User")
], User);
exports.User = User;
