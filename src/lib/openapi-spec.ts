// src/lib/openapi-spec.ts
// Sazanami API v1 の OpenAPI 3.1 仕様。
// 契約は docs/api-v1.md。エンドポイントやスキーマを変えたら両方を更新すること。
// このファイルは /api/v1/openapi.json と /docs（Scalar）から参照される。

export const openApiSpec = {
	openapi: '3.1.0',
	info: {
		title: 'Sazanami API',
		version: '1.0.0',
		summary: 'Sazanami の外部クライアント向け公開API',
		description: [
			'Sazanami の外部クライアント（MCP・スクリプト・将来のモバイルアプリ）向け公開API。',
			'',
			'- ベースパス: `/api/v1`',
			'- 認証: `Authorization: Bearer sznm_...`（個人アクセストークン）またはセッションCookie',
			'- スコープ: `read` / `write`（カンマ区切りで複数指定）',
			'- 日時: ISO 8601 文字列',
			'- すべての操作は認証ユーザー自身のノートに限定される（他人のノートは404）',
			'- レート制限は未実装（トークン単位の `lastUsedAt` のみ記録）'
		].join('\n')
	},
	servers: [
		{
			url: 'https://sazanami-dev.kaedesato.work',
			description: '開発環境'
		},
		{
			url: 'https://sazanami.kaedesato.work',
			description: '本番環境'
		}
	],
	tags: [
		{ name: 'system', description: '稼働確認' },
		{ name: 'auth', description: '認証ユーザー' },
		{ name: 'notes', description: 'ノートの作成・取得・更新・削除' },
		{ name: 'search', description: 'ノート検索' }
	],
	security: [{ bearerAuth: [] }],
	paths: {
		'/api/v1/export': {
			get: {
				tags: ['export'],
				operationId: 'exportNotes',
				summary: '全ノートをエクスポート',
				description:
					'format=json（既定）はJSON、format=md はMarkdown(frontmatter付き)のZIPを返す。limit と cursor で分割取得できる。',
				parameters: [
					{
						name: 'format',
						in: 'query',
						required: false,
						schema: { type: 'string', enum: ['json', 'md'], default: 'json' }
					},
					{
						name: 'limit',
						in: 'query',
						required: false,
						schema: { type: 'integer', minimum: 1, maximum: 20000, default: 5000 }
					},
					{
						name: 'cursor',
						in: 'query',
						required: false,
						schema: { type: 'string' },
						description: '前回レスポンスの nextCursor'
					}
				],
				responses: {
					'200': {
						description: 'エクスポート結果（format=md のときはZIP）',
						content: {
							'application/json': {
								schema: {
									type: 'object',
									properties: {
										version: { type: 'integer', const: 1 },
										exportedAt: { type: 'string', format: 'date-time' },
										count: { type: 'integer' },
										nextCursor: { type: 'string', nullable: true },
										notes: {
											type: 'array',
											items: { $ref: '#/components/schemas/ExportNote' }
										}
									}
								}
							},
							'application/zip': { schema: { type: 'string', format: 'binary' } }
						}
					},
					'401': {
						description: '未認証',
						content: {
							'application/json': { schema: { $ref: '#/components/schemas/Error' } }
						}
					}
				}
			}
		},
		'/api/v1/import': {
			post: {
				tags: ['export'],
				operationId: 'importNotes',
				summary: '全ノートを一括インポート',
				description: 'export_notes/エクスポートJSONの notes 配列を投入する。1回500件まで。',
				requestBody: {
					required: true,
					content: {
						'application/json': {
							schema: {
								type: 'object',
								required: ['notes'],
								properties: {
									notes: {
										type: 'array',
										minItems: 1,
										maxItems: 500,
										items: { $ref: '#/components/schemas/ExportNote' }
									},
									skipExistingTitles: { type: 'boolean', default: true }
								}
							}
						}
					}
				},
				responses: {
					'200': {
						description: '取り込み結果',
						content: {
							'application/json': {
								schema: {
									type: 'object',
									properties: {
										imported: { type: 'integer' },
										skipped: { type: 'integer' },
										failed: { type: 'integer' },
										errors: {
											type: 'array',
											items: {
												type: 'object',
												properties: {
													index: { type: 'integer' },
													message: { type: 'string' }
												}
											}
										}
									}
								}
							}
						}
					},
					'401': {
						description: '未認証',
						content: {
							'application/json': { schema: { $ref: '#/components/schemas/Error' } }
						}
					}
				}
			}
		},
		'/api/v1/health': {
			get: {
				tags: ['system'],
				operationId: 'getHealth',
				summary: 'ヘルスチェック',
				description: '認証不要。APIの稼働状態を返す。',
				security: [],
				responses: {
					'200': {
						description: '稼働中',
						content: {
							'application/json': {
								schema: { $ref: '#/components/schemas/HealthResponse' }
							}
						}
					}
				}
			}
		},
		'/api/v1/me': {
			get: {
				tags: ['auth'],
				operationId: 'getMe',
				summary: '認証ユーザー情報を取得',
				description: 'アクセストークンまたはセッションCookieの主体となるユーザーを返す。',
				responses: {
					'200': {
						description: '認証ユーザー',
						content: {
							'application/json': {
								schema: { $ref: '#/components/schemas/MeResponse' }
							}
						}
					},
					'401': { $ref: '#/components/responses/Unauthorized' }
				}
			}
		},
		'/api/v1/notes': {
			get: {
				tags: ['notes'],
				operationId: 'listNotes',
				summary: 'ノート一覧を取得',
				description: [
					'認証ユーザーのノートを新しい順に返す。',
					'- `status` 省略時は `box-deleted` を除くすべてのステータス',
					'- `include=content` を指定した時だけ本文を含む',
					'- レスポンスの各要素は一覧用の `noteSummary`（`excerpt` 付き）'
				].join('\n'),
				parameters: [
					{
						name: 'status',
						in: 'query',
						required: false,
						description:
							'カンマ区切りのステータス（`inbox,box,archived,trash,box-archived,box-deleted`）。既定は `box-deleted` を除く全部。',
						style: 'form',
						explode: false,
						schema: {
							type: 'array',
							items: { $ref: '#/components/schemas/NoteStatus' }
						}
					},
					{
						name: 'q',
						in: 'query',
						required: false,
						description: 'タイトル・本文の部分一致',
						schema: { type: 'string' }
					},
					{
						name: 'tag',
						in: 'query',
						required: false,
						description: 'タグ名',
						schema: { type: 'string' }
					},
					{ $ref: '#/components/parameters/Limit' },
					{ $ref: '#/components/parameters/Offset' },
					{
						name: 'sort',
						in: 'query',
						required: false,
						description: '並び替えの基準（既定は `updated`）',
						schema: {
							type: 'string',
							enum: ['updated', 'created', 'title'],
							default: 'updated'
						}
					},
					{
						name: 'order',
						in: 'query',
						required: false,
						description: '並び順（既定は `desc`）',
						schema: {
							type: 'string',
							enum: ['desc', 'asc'],
							default: 'desc'
						}
					},
					{
						name: 'include',
						in: 'query',
						required: false,
						description: '`content` を指定した時だけ本文を含む',
						schema: { type: 'string', enum: ['content'] }
					}
				],
				responses: {
					'200': {
						description: 'ノート一覧',
						content: {
							'application/json': {
								schema: { $ref: '#/components/schemas/NoteListResponse' }
							}
						}
					},
					'401': { $ref: '#/components/responses/Unauthorized' }
				}
			},
			post: {
				tags: ['notes'],
				operationId: 'createNote',
				summary: 'ノートを作成',
				description: [
					'`write` スコープが必要。',
					'- `title` 省略時は `Untitled Note`、`status` 省略時は `inbox`',
					'- `slug` は自動生成（`generateSlug`）',
					'- 保存後に WikiLink を解決する（`updateNoteLinks`）',
					'- `parentId` は同一ユーザーのノートのみ許可（違反は400）'
				].join('\n'),
				requestBody: {
					required: true,
					content: {
						'application/json': {
							schema: { $ref: '#/components/schemas/CreateNoteBody' }
						}
					}
				},
				responses: {
					'201': {
						description: '作成されたノート',
						content: {
							'application/json': {
								schema: { $ref: '#/components/schemas/NoteResponse' }
							}
						}
					},
					'400': { $ref: '#/components/responses/BadRequest' },
					'401': { $ref: '#/components/responses/Unauthorized' },
					'403': { $ref: '#/components/responses/Forbidden' }
				}
			}
		},
		'/api/v1/notes/{id}': {
			parameters: [{ $ref: '#/components/parameters/NoteId' }],
			get: {
				tags: ['notes'],
				operationId: 'getNote',
				summary: 'ノートを取得',
				description: '認証ユーザー自身のノートのみ取得できる（他人のノートは404）。',
				responses: {
					'200': {
						description: 'ノート',
						content: {
							'application/json': {
								schema: { $ref: '#/components/schemas/NoteResponse' }
							}
						}
					},
					'401': { $ref: '#/components/responses/Unauthorized' },
					'404': { $ref: '#/components/responses/NotFound' }
				}
			},
			put: {
				tags: ['notes'],
				operationId: 'updateNote',
				summary: 'ノートを更新（部分更新）',
				description: [
					'`write` スコープが必要。指定したフィールドだけを更新する。',
					'- `title` 変更時はバックリンクを更新する（`updateBacklinksOnTitleChange`）',
					'- `title` / `content` 変更時は WikiLink を再解決する（`updateNoteLinks`）',
					'- 変更がなければ200で現状を返す',
					'- `updatedAt` は実際に更新した時だけ更新される'
				].join('\n'),
				requestBody: {
					required: true,
					content: {
						'application/json': {
							schema: { $ref: '#/components/schemas/UpdateNoteBody' }
						}
					}
				},
				responses: {
					'200': {
						description: '更新後のノート',
						content: {
							'application/json': {
								schema: { $ref: '#/components/schemas/NoteResponse' }
							}
						}
					},
					'400': { $ref: '#/components/responses/BadRequest' },
					'401': { $ref: '#/components/responses/Unauthorized' },
					'403': { $ref: '#/components/responses/Forbidden' },
					'404': { $ref: '#/components/responses/NotFound' }
				}
			},
			delete: {
				tags: ['notes'],
				operationId: 'deleteNote',
				summary: 'ノートを削除',
				description: [
					'`write` スコープが必要。',
					'- 既定はゴミ箱へ移動（`status = "trash"`）',
					'- `?permanent=true` で完全削除'
				].join('\n'),
				parameters: [
					{
						name: 'permanent',
						in: 'query',
						required: false,
						description: '`true` なら完全削除、既定（`false`）はゴミ箱へ移動',
						schema: { type: 'boolean', default: false }
					}
				],
				responses: {
					'200': {
						description: '削除結果',
						content: {
							'application/json': {
								schema: { $ref: '#/components/schemas/DeleteNoteResponse' }
							}
						}
					},
					'401': { $ref: '#/components/responses/Unauthorized' },
					'403': { $ref: '#/components/responses/Forbidden' },
					'404': { $ref: '#/components/responses/NotFound' }
				}
			}
		},
		'/api/v1/notes/{id}/links': {
			parameters: [{ $ref: '#/components/parameters/NoteId' }],
			get: {
				tags: ['notes'],
				operationId: 'getNoteLinks',
				summary: 'ノートのリンク関係を取得',
				description:
					'1ホップリンク・バックリンク・2ホップリンクを、それぞれ `noteSummary` の配列で返す。',
				responses: {
					'200': {
						description: 'リンク関係',
						content: {
							'application/json': {
								schema: { $ref: '#/components/schemas/LinksResponse' }
							}
						}
					},
					'401': { $ref: '#/components/responses/Unauthorized' },
					'404': { $ref: '#/components/responses/NotFound' }
				}
			}
		},
		'/api/v1/search': {
			get: {
				tags: ['search'],
				operationId: 'searchNotes',
				summary: 'ノートを検索',
				description:
					'タイトル・本文の部分一致で検索する。`status` 省略時は `trash` と `box-deleted` を除外する。',
				parameters: [
					{
						name: 'q',
						in: 'query',
						required: true,
						description: '検索キーワード',
						schema: { type: 'string' }
					},
					{ $ref: '#/components/parameters/Limit' },
					{ $ref: '#/components/parameters/Offset' },
					{
						name: 'status',
						in: 'query',
						required: false,
						description: 'カンマ区切りのステータス。既定は `trash` と `box-deleted` を除外。',
						style: 'form',
						explode: false,
						schema: {
							type: 'array',
							items: { $ref: '#/components/schemas/NoteStatus' }
						}
					}
				],
				responses: {
					'200': {
						description: '検索結果',
						content: {
							'application/json': {
								schema: { $ref: '#/components/schemas/SearchResponse' }
							}
						}
					},
					'400': { $ref: '#/components/responses/BadRequest' },
					'401': { $ref: '#/components/responses/Unauthorized' }
				}
			}
		}
	},
	components: {
		securitySchemes: {
			bearerAuth: {
				type: 'http',
				scheme: 'bearer',
				bearerFormat: 'sznm_...',
				description: [
					'個人アクセストークン。`Authorization: Bearer sznm_...` の形式で送る。',
					'スコープは `read` / `write`（カンマ区切りで複数）。',
					'ブラウザからのセッションCookieでも利用できる（スコープは read+write）。',
					'トークン管理（`/api/tokens`）はセッションのみで、トークンからは操作できない。'
				].join('\n')
			}
		},
		parameters: {
			Limit: {
				name: 'limit',
				in: 'query',
				required: false,
				description: '取得件数（既定20・最大100）',
				schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 }
			},
			Offset: {
				name: 'offset',
				in: 'query',
				required: false,
				description: 'スキップする件数（既定0）',
				schema: { type: 'integer', minimum: 0, default: 0 }
			},
			NoteId: {
				name: 'id',
				in: 'path',
				required: true,
				description: 'ノートID（ULID）',
				schema: {
					type: 'string',
					examples: ['01J8Z3K4Q5R6S7T8V9W0X1Y2Z3']
				}
			}
		},
		responses: {
			BadRequest: {
				description: 'リクエストが不正（バリデーションエラー）',
				content: {
					'application/json': {
						schema: { $ref: '#/components/schemas/Error' }
					}
				}
			},
			Unauthorized: {
				description: '未認証（トークン未指定・無効・期限切れ）',
				content: {
					'application/json': {
						schema: { $ref: '#/components/schemas/Error' }
					}
				}
			},
			Forbidden: {
				description: 'スコープ不足（`write` が必要）',
				content: {
					'application/json': {
						schema: { $ref: '#/components/schemas/Error' }
					}
				}
			},
			NotFound: {
				description: 'ノートが存在しない、または他人のノート',
				content: {
					'application/json': {
						schema: { $ref: '#/components/schemas/Error' }
					}
				}
			}
		},
		schemas: {
			NoteStatus: {
				type: 'string',
				description: 'ノートのステータス',
				enum: ['inbox', 'box', 'archived', 'trash', 'box-archived', 'box-deleted']
			},
			Note: {
				type: 'object',
				description: 'ノートの完全形（本文・タグ・リンク解決結果を含む）',
				required: [
					'id',
					'title',
					'slug',
					'content',
					'status',
					'isPublic',
					'isPinned',
					'parentId',
					'context',
					'createdAt',
					'updatedAt',
					'resolvedLinks',
					'tags'
				],
				properties: {
					id: {
						type: 'string',
						description: 'ノートID（ULID）',
						examples: ['01J8Z3K4Q5R6S7T8V9W0X1Y2Z3']
					},
					title: { type: 'string' },
					slug: { type: 'string', examples: ['title-abc123'] },
					content: {
						type: ['string', 'null'],
						description: 'Markdown本文'
					},
					status: { $ref: '#/components/schemas/NoteStatus' },
					isPublic: { type: 'boolean' },
					isPinned: { type: 'boolean' },
					parentId: {
						type: ['string', 'null'],
						description: 'リプライ元のノートID'
					},
					context: {
						type: ['string', 'null'],
						description: '人間が後から追記するコンテキスト'
					},
					createdAt: { type: 'string', format: 'date-time' },
					updatedAt: { type: 'string', format: 'date-time' },
					resolvedLinks: {
						type: 'object',
						description: 'WikiLink のタイトル→ノートID マップ',
						additionalProperties: { type: 'string' }
					},
					tags: {
						type: 'array',
						items: { type: 'string' }
					}
				}
			},
			NoteSummary: {
				type: 'object',
				description:
					'一覧・検索用のノート。`note` から `content` を除き、`excerpt`（本文先頭200文字・改行は空白化）を足した形。',
				required: [
					'id',
					'title',
					'slug',
					'status',
					'isPublic',
					'isPinned',
					'parentId',
					'context',
					'createdAt',
					'updatedAt',
					'resolvedLinks',
					'tags',
					'excerpt'
				],
				properties: {
					id: { type: 'string', description: 'ノートID（ULID）' },
					title: { type: 'string' },
					slug: { type: 'string' },
					status: { $ref: '#/components/schemas/NoteStatus' },
					isPublic: { type: 'boolean' },
					isPinned: { type: 'boolean' },
					parentId: { type: ['string', 'null'] },
					context: { type: ['string', 'null'] },
					createdAt: { type: 'string', format: 'date-time' },
					updatedAt: { type: 'string', format: 'date-time' },
					resolvedLinks: {
						type: 'object',
						additionalProperties: { type: 'string' }
					},
					tags: {
						type: 'array',
						items: { type: 'string' }
					},
					excerpt: {
						type: 'string',
						description: '本文先頭200文字（改行は空白に置換）'
					},
					content: {
						type: ['string', 'null'],
						description: '`include=content` を指定したときだけ含まれる本文'
					}
				}
			},
			User: {
				type: 'object',
				required: ['id', 'name', 'username', 'image'],
				properties: {
					id: { type: 'string' },
					name: { type: 'string' },
					username: { type: ['string', 'null'] },
					image: { type: ['string', 'null'], format: 'uri' }
				}
			},
			HealthResponse: {
				type: 'object',
				required: ['ok', 'version'],
				properties: {
					ok: { type: 'boolean', const: true },
					version: { type: 'string', const: 'v1' }
				}
			},
			MeResponse: {
				type: 'object',
				required: ['user'],
				properties: {
					user: { $ref: '#/components/schemas/User' }
				}
			},
			CreateNoteBody: {
				type: 'object',
				description: '作成するノート。すべて任意フィールド。',
				properties: {
					title: {
						type: 'string',
						default: 'Untitled Note',
						description: '省略時は `Untitled Note`'
					},
					content: { type: 'string', default: '', description: 'Markdown本文' },
					status: {
						$ref: '#/components/schemas/NoteStatus'
					},
					isPublic: { type: 'boolean', default: false },
					parentId: {
						type: ['string', 'null'],
						default: null,
						description: '同一ユーザーのノートIDのみ許可（違反は400）'
					},
					tags: {
						type: 'array',
						items: { type: 'string' },
						description: 'タグ名。存在しないタグは自動作成される'
					}
				}
			},
			UpdateNoteBody: {
				type: 'object',
				description: '部分更新。指定したフィールドだけを更新し、変更がなければ現状を返す。',
				properties: {
					title: { type: 'string' },
					content: { type: 'string' },
					status: { $ref: '#/components/schemas/NoteStatus' },
					isPublic: { type: 'boolean' },
					isPinned: { type: 'boolean' },
					context: { type: ['string', 'null'] }
				}
			},
			NoteResponse: {
				type: 'object',
				required: ['note'],
				properties: {
					note: { $ref: '#/components/schemas/Note' }
				}
			},
			NoteListResponse: {
				type: 'object',
				required: ['notes', 'total', 'limit', 'offset'],
				properties: {
					notes: {
						type: 'array',
						items: { $ref: '#/components/schemas/NoteSummary' }
					},
					total: { type: 'integer', description: '条件に一致する総件数' },
					limit: { type: 'integer' },
					offset: { type: 'integer' }
				}
			},
			SearchResponse: {
				type: 'object',
				required: ['notes', 'total', 'q'],
				properties: {
					notes: {
						type: 'array',
						items: { $ref: '#/components/schemas/NoteSummary' }
					},
					total: { type: 'integer' },
					q: { type: 'string' }
				}
			},
			LinksResponse: {
				type: 'object',
				required: ['oneHopLinks', 'backlinks', 'twoHopLinks'],
				properties: {
					oneHopLinks: {
						type: 'array',
						items: { $ref: '#/components/schemas/NoteSummary' }
					},
					backlinks: {
						type: 'array',
						items: { $ref: '#/components/schemas/NoteSummary' }
					},
					twoHopLinks: {
						type: 'array',
						items: { $ref: '#/components/schemas/NoteSummary' }
					}
				}
			},
			ExportNote: {
				type: 'object',
				required: ['id', 'title', 'content', 'status', 'tags'],
				properties: {
					id: { type: 'string' },
					title: { type: 'string' },
					content: { type: 'string' },
					status: { type: 'string' },
					isPublic: { type: 'boolean' },
					isPinned: { type: 'boolean' },
					tags: { type: 'array', items: { type: 'string' } },
					createdAt: { type: 'string', format: 'date-time' },
					updatedAt: { type: 'string', format: 'date-time' },
					parentId: { type: 'string', nullable: true }
				}
			},
			DeleteNoteResponse: {
				type: 'object',
				required: ['id', 'deleted', 'permanent'],
				properties: {
					id: { type: 'string' },
					deleted: { type: 'boolean', const: true },
					permanent: {
						type: 'boolean',
						description: '`true` なら完全削除、`false` ならゴミ箱移動'
					}
				}
			},
			Error: {
				type: 'object',
				required: ['error'],
				properties: {
					error: {
						type: 'object',
						required: ['code', 'message'],
						properties: {
							code: {
								type: 'string',
								examples: ['not_found']
							},
							message: { type: 'string' }
						}
					}
				}
			}
		}
	}
} as const;
