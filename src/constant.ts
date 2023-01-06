export const AA_GUILD_ID = "606109479003750440"


export const SLASH_COMMAND = [{
  name: 'balance',
  description: '所持金を確認します。ユーザをつけるとそのユーザの所持金が見れます',
  options: [
    {
      name: "user",
      required: false,
      description: "ユーザ",
      type: 6
    }
  ]
}, {
  name: 'rank',
  description: '所持金ランキングを確認します。',
},
  {
    name: 'send',
    description: '自分の所持金からユーザに対してお金を送金します',
    options: [
      {
        name: "user",
        required: true,
        description: "ユーザ",
        type: 6
      },
      {
        name: "amount",
        required: true,
        description: "量",
        type: 4
      },
      {
        name: "memo",
        required: false,
        description: "取引のメモ",
        type: 3
      }
    ]
  },
  {
    name: 'transaction',
    description: 'ユーザの送金履歴を見ます。ユーザをつけるとそのユーザの送金履歴が見れます',
    options: [
      {
        name: "user",
        required: false,
        description: "ユーザ",
        type: 6
      }
    ]
  },

  {
    name: 'harae',
    description: 'ユーザにああPを請求します。',
    options: [
      {
        name: "user",
        required: true,
        description: "請求先ユーザ",
        type: 6
      },
      {
        name: "amount",
        required: true,
        description: "量",
        type: 4
      },
      {
        name: "memo",
        required: false,
        description: "取引のメモ",
        type: 3
      }
    ]
  },
  {
    name: 'seikyu',
    description: 'ユーザにああPを請求します。',
    options: [
      {
        name: "user",
        required: true,
        description: "請求先ユーザ",
        type: 6
      },
      {
        name: "amount",
        required: true,
        description: "量",
        type: 4
      },
      {
        name: "memo",
        required: false,
        description: "取引のメモ",
        type: 3
      }
    ]
  },
  {
    name: 'request',
    description: 'ユーザにああPを請求します。',
    options: [
      {
        name: "user",
        required: true,
        description: "請求先ユーザ",
        type: 6
      },
      {
        name: "amount",
        required: true,
        description: "量",
        type: 4
      },
      {
        name: "memo",
        required: false,
        description: "取引のメモ",
        type: 3
      }
    ]
  },
  ];
